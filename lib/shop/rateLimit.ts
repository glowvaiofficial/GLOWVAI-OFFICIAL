// Rate limiting for the shop and rider/vendor APIs. Two backends:
//  - Shared (Upstash Redis over REST), when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are both set. Counts are
//    kept across serverless instances in a fixed window (INCR + EXPIRE in one pipeline).
//  - In-memory (per instance, a sliding log), used when Upstash is not configured and as the fallback when it fails.
// Upstash errors fail OPEN: the request is never refused because the limiter store is down. The in-memory limiter still
// decides in that case. Keys are hashed with SHA-256 before anything is stored or sent, so no raw IP address or user id
// ever reaches Upstash or the in-memory map. Nothing here imports server-only modules, so it can be tested on its own.
import { createHash } from "node:crypto";

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

export const UPSTASH_TIMEOUT_MS = 2000;

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

// ---- Shared limiter (Upstash REST).

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

// A short, PII-free reason for the log line: never the key, the IP, the uid or the response body.
function reasonOf(err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  if (err instanceof UpstashError) return `http_${err.status}`;
  if (err instanceof Error && err.name) return err.name;
  return "error";
}

class UpstashError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`upstash status ${status}`);
    this.name = "UpstashError";
    this.status = status;
  }
}

async function upstashCheck(cfg: { url: string; token: string }, input: RateLimitInput, now: number): Promise<RateLimitResult> {
  const windowIndex = Math.floor(now / input.windowMs);
  const redisKey = `glowvai:rl:${hashKey(input.key)}:${windowIndex}`;
  const ttlSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(ttlSeconds)],
      ]),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new UpstashError(res.status);
    const data = (await res.json()) as unknown;
    const first = Array.isArray(data) ? (data[0] as { result?: unknown; error?: unknown } | undefined) : undefined;
    const count = Number(first?.result);
    if (!first || first.error !== undefined || !Number.isFinite(count)) throw new Error("upstash bad response");

    const allowed = count <= input.max;
    return {
      allowed,
      remaining: allowed ? input.max - count : 0,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(((windowIndex + 1) * input.windowMs - now) / 1000)),
    };
  } finally {
    clearTimeout(timer);
  }
}

// The one call routes use (async). Shared when configured, in-memory otherwise or when the shared store fails.
export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const cfg = upstashConfig();
  if (!cfg) return memoryCheck(input.key, input.max, input.windowMs, now);
  try {
    return await upstashCheck(cfg, input, now);
  } catch (err) {
    console.warn(`[ratelimit] shared limiter unavailable (${reasonOf(err)}); using in-memory limiter`);
    return memoryCheck(input.key, input.max, input.windowMs, now);
  }
}
