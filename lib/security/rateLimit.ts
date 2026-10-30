/**
 * Fixed-window rate limiter keyed by client IP (or any string).
 *
 * Note: this keeps counts in memory of the running instance. On serverless hosting
 * each instance has its own counts, so this slows down bursts from one client but is
 * not a global quota. Use a shared store (for example Upstash Redis) for a hard limit.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (store.size > 10_000) store.clear();

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
