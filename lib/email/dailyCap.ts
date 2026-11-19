import { createHash } from "node:crypto";

/**
 * GLOW VAI global daily email cap. Resend's free plan allows about 100 emails a day, so every send takes one slot from a
 * shared Firestore counter (one document per UTC day in the rateLimits collection, removed later by the rate-limits cron).
 *
 * Order and other transactional mail may use the whole cap (EMAIL_DAILY_CAP, default 80). Marketing and digest mail stops
 * earlier, when MARKETING_RESERVE slots are left, so a busy day never crowds out an order email. A refused slot is not
 * counted. Fails soft: this never throws. If the counter cannot be read, transactional mail is still sent (an order must
 * not be lost) and marketing mail is held back.
 */
export const DEFAULT_EMAIL_DAILY_CAP = 80;
export const MARKETING_RESERVE = 20;
const COLLECTION = "rateLimits";
const STORE_TIMEOUT_MS = 2000;

export function dailyCap(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_EMAIL_DAILY_CAP;
}

// The count at which a stream stops: the whole cap for transactional, the cap less the reserve for marketing.
export function streamLimit(stream: "transactional" | "marketing", cap: number): number {
  return stream === "marketing" ? Math.max(0, cap - MARKETING_RESERVE) : cap;
}

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export interface CapStore {
  // Adds one to today's count when it is below `limit`. Returns whether a slot was taken.
  take(docId: string, limit: number, expiresAt: number): Promise<boolean>;
}

async function firestoreStore(): Promise<CapStore> {
  const { db } = await import("@/lib/shop/server");
  const { Timestamp } = await import("firebase-admin/firestore");
  const store = db();
  return {
    async take(docId, limit, expiresAt) {
      const ref = store.collection(COLLECTION).doc(docId);
      return store.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = snap.exists ? Number((snap.data() as { count?: unknown }).count) || 0 : 0;
        if (count >= limit) return false;
        tx.set(ref, { count: count + 1, windowStart: Date.now(), expiresAt: Timestamp.fromMillis(expiresAt) });
        return true;
      });
    },
  };
}

// True when this email may be sent. Never throws.
export async function takeEmailSlot(
  stream: "transactional" | "marketing",
  opts: { now?: number; cap?: number; store?: CapStore } = {},
): Promise<boolean> {
  const now = opts.now ?? Date.now();
  const cap = opts.cap ?? dailyCap(process.env.EMAIL_DAILY_CAP);
  const limit = streamLimit(stream, cap);
  try {
    const store = opts.store ?? (await firestoreStore());
    const docId = createHash("sha256").update(`email-daily:${dayKey(now)}`).digest("hex");
    const work = store.take(docId, limit, now + 2 * 24 * 60 * 60 * 1000);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), STORE_TIMEOUT_MS);
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn(`[email-cap] counter unavailable (${err instanceof Error ? err.name : "error"}); ${stream === "marketing" ? "holding marketing mail" : "sending anyway"}`);
    return stream !== "marketing";
  }
}
