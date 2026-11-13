// Rate limiting for the shop and rider/vendor APIs. Two backends, chosen by the caller:
//  - Shared (Firestore counter), when a Firestore handle is passed in. Only the sensitive routes use it (see
//    limitByIpShared / limitByUserShared / checkShared in lib/shop/server.ts). One document per key in the `rateLimits`
//    collection, read and written inside one transaction per check.
//  - In-memory (per instance, a sliding log), for every other route and as the fallback when Firestore fails.
//
// Free-tier note: each sensitive request costs one Firestore read and one Firestore write. A denied request is counted
// too, so it costs the same. A route that checks both the IP and the user costs two reads and two writes per request.
// The owner should keep the limits on those routes low to stay inside the free quota.
//
// Stored data is minimal: the document id is the SHA-256 of the key, and the document holds only count, windowStart and
// expiresAt (numbers). No raw IP address, uid, phone number or key is written anywhere.
//
// Cleanup: every document carries expiresAt (windowStart + windowMs). No scheduled job is needed. An expired document is
// reset in place the next time its key is checked. A Firestore TTL policy on `expiresAt` can delete the stale documents
// as well; that is optional.
//
// Failure: any Firestore error, or a check slower than STORE_TIMEOUT_MS, fails OPEN. The in-memory limiter decides
// instead, so a request is never refused because the store is down. The log line names the error type only, never the
// key, the IP or the uid.
//
// Nothing here imports server-only modules (the firebase-admin import is type-only and is erased), so it can be tested alone.
import { createHash } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";

export const RATE_LIMIT_COLLECTION = "rateLimits";
export const STORE_TIMEOUT_MS = 2000;

export interface RateLimitInput {
  key: string;
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// The only fields ever written to Firestore.
export interface RateLimitDoc {
  count: number;
  windowStart: number;
  expiresAt: number;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// ---- In-memory limiter (sliding log). Synchronous, so the sync helpers in lib/shop/server.ts keep working.

const memory = new Map<string, number[]>();
const MEMORY_SWEEP_AT = 5000;

function sweep(now: number) {
  if (memory.size < MEMORY_SWEEP_AT) return;
  for (const [k, list] of memory) {
    if (!list.length || now - list[list.length - 1] >= 24 * 60 * 60 * 1000) memory.delete(k);
  }
}

export function memoryCheck(key: string, max: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const stored = hashKey(key);
  const list = (memory.get(stored) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    memory.set(stored, list);
    const oldest = list[0] ?? now;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  list.push(now);
  sweep(now);
  memory.set(stored, list);
  return { allowed: true, remaining: max - list.length, retryAfterSeconds: 0 };
}

// ---- Fixed-window maths for the Firestore counter (pure, so it can be tested without a database).

// The document after one more request at `now`. A window that has passed (or a missing or damaged document) starts again.
export function nextWindow(stored: Partial<RateLimitDoc> | undefined, windowMs: number, now: number): RateLimitDoc {
  const live =
    stored !== undefined &&
    Number.isFinite(stored.count) &&
    Number.isFinite(stored.windowStart) &&
    now >= (stored.windowStart as number) &&
    now - (stored.windowStart as number) < windowMs;
  const windowStart = live ? (stored!.windowStart as number) : now;
  const count = (live ? (stored!.count as number) : 0) + 1;
  return { count, windowStart, expiresAt: windowStart + windowMs };
}

// Allowed while the count is within max. Over max is refused, with the seconds left in the current window.
export function decide(doc: RateLimitDoc, max: number, windowMs: number, now: number): RateLimitResult {
  const allowed = doc.count <= max;
  return {
    allowed,
    remaining: allowed ? max - doc.count : 0,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((doc.windowStart + windowMs - now) / 1000)),
  };
}

// ---- Shared limiter (Firestore). One transaction: read the document, move the window on if needed, add one, write back.

export async function firestoreCheck(db: Firestore, input: RateLimitInput, now: number): Promise<RateLimitResult> {
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(hashKey(input.key));
  const next = await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    const doc = nextWindow(snap.exists ? (snap.data() as Partial<RateLimitDoc>) : undefined, input.windowMs, now);
    tx.set(ref, doc);
    return doc;
  });
  return decide(next, input.max, input.windowMs, now);
}

class StoreTimeoutError extends Error {
  constructor() {
    super("rate limit store timed out");
    this.name = "StoreTimeoutError";
  }
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StoreTimeoutError()), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// A short, PII-free reason for the log line: never the key, the IP, the uid or the error message.
function reasonOf(err: unknown): string {
  if (err instanceof StoreTimeoutError) return "timeout";
  if (err && typeof err === "object" && "code" in err && (typeof (err as { code: unknown }).code === "number" || typeof (err as { code: unknown }).code === "string")) {
    return `firestore_${String((err as { code: unknown }).code)}`;
  }
  if (err instanceof Error && err.name) return err.name;
  return "error";
}

// The one call routes use (async). Firestore when a handle is given, in-memory otherwise or when Firestore fails.
export async function checkRateLimit(input: RateLimitInput, store?: Firestore | null): Promise<RateLimitResult> {
  const now = Date.now();
  if (!store) return memoryCheck(input.key, input.max, input.windowMs, now);
  try {
    return await withTimeout(firestoreCheck(store, input, now), STORE_TIMEOUT_MS);
  } catch (err) {
    console.warn(`[ratelimit] shared limiter unavailable (${reasonOf(err)}); using in-memory limiter`);
    return memoryCheck(input.key, input.max, input.windowMs, now);
  }
}
