// Attribution rules, pure: the signed attribution cookie, the 30-day window anchored on the first click, last click wins
// inside the window, and the per-visitor-per-day click key. The cookie carries the affiliate code and the window's start;
// it is signed with AFFILIATE_COOKIE_SECRET, so a visitor cannot move the window or name an affiliate by hand.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AFFILIATE_CONFIG } from "./config";

const DAY_MS = 86_400_000;
export const ATTRIBUTION_WINDOW_MS = AFFILIATE_CONFIG.attributionWindowDays * DAY_MS;

export interface AttributionCookie {
  code: string;
  // When the window opened: the visitor's first click in this window (ms since epoch).
  anchor: number;
}

// A new click inside an open window changes the affiliate (last click wins) but keeps the window's start. A click after the
// window has closed opens a new window.
export function nextAttribution(prev: AttributionCookie | null, code: string, now: number): AttributionCookie {
  if (prev && now >= prev.anchor && now - prev.anchor < ATTRIBUTION_WINDOW_MS) return { code, anchor: prev.anchor };
  return { code, anchor: now };
}

// The affiliate code that earns an order placed at `now`, or null when the window has closed.
export function attributedCode(cookie: AttributionCookie | null, now: number): string | null {
  if (!cookie) return null;
  if (now < cookie.anchor || now - cookie.anchor >= ATTRIBUTION_WINDOW_MS) return null;
  return cookie.code;
}

export function attributionExpiresAt(cookie: AttributionCookie): number {
  return cookie.anchor + ATTRIBUTION_WINDOW_MS;
}

const CODE_SHAPE = new RegExp(`^[${AFFILIATE_CONFIG.codeAlphabet}]{${AFFILIATE_CONFIG.codeLength}}$`);

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`affiliate-attribution:${payload}`).digest("base64url");
}

// Format: base64url(JSON {c, a}) "." base64url(HMAC). Empty when no secret is configured (then nothing is attributed).
export function signAttribution(cookie: AttributionCookie, secret: string): string {
  if (!secret) return "";
  const payload = Buffer.from(JSON.stringify({ c: cookie.code, a: cookie.anchor }), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readAttribution(value: string | undefined | null, secret: string): AttributionCookie | null {
  if (!secret || !value || value.length > 400) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { c?: unknown; a?: unknown };
    if (typeof data.c !== "string" || !CODE_SHAPE.test(data.c)) return null;
    if (typeof data.a !== "number" || !Number.isSafeInteger(data.a) || data.a <= 0) return null;
    return { code: data.c, anchor: data.a };
  } catch {
    return null;
  }
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// The click-dedupe key: a hash of the visitor's random cookie id, the link and the day. The raw id is never stored.
export function visitorClickKey(visitorId: string, code: string, day: string): string {
  return createHash("sha256").update(`affiliate-click|${visitorId}|${code}|${day}`).digest("hex");
}

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value);
}
