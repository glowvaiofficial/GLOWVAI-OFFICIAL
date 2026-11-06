// The rider session: a token signed with HMAC-SHA256 over its payload, kept in an HttpOnly, Secure, SameSite=Strict
// cookie for 8 hours. Pure (node:crypto only). The secret comes from RIDER_SESSION_SECRET and is never a fallback.
import { createHmac, timingSafeEqual } from "node:crypto";
import { RiderError } from "./errors";

export const RIDER_COOKIE = "gv_rider";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;
const PARTNER_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** The signing secret. Missing or short means the rider routes refuse to run at all (503). */
export function riderSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.RIDER_SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new RiderError("NOT_CONFIGURED", 503, "Rider sign-in is not set up yet. Please try again later.");
  }
  return secret;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function mac(payloadPart: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`rider-session.v1.${payloadPart}`).digest();
}

/** A session token for one partner, issued at `now` and valid for 8 hours. */
export function signRiderSession(partnerId: string, now: number, secret: string): string {
  if (!PARTNER_ID.test(partnerId)) throw new Error("Invalid partner id for a rider session.");
  const payload = b64url(Buffer.from(JSON.stringify({ v: 1, pid: partnerId, iat: now, exp: now + SESSION_TTL_MS })));
  return `${payload}.${b64url(mac(payload, secret))}`;
}

/** The partner id in a valid, unexpired token signed with this secret. Anything else is null. */
export function verifyRiderSession(token: string | null | undefined, now: number, secret: string): { partnerId: string; expiresAt: number } | null {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  const expected = mac(payload, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let data: { v?: unknown; pid?: unknown; iat?: unknown; exp?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (data.v !== 1 || typeof data.pid !== "string" || !PARTNER_ID.test(data.pid)) return null;
  if (typeof data.exp !== "number" || typeof data.iat !== "number") return null;
  if (data.exp <= now || data.iat > now + 60_000 || data.exp - data.iat > SESSION_TTL_MS) return null;
  return { partnerId: data.pid, expiresAt: data.exp };
}

/** Cookie attributes for the rider session. Secure and SameSite=Strict are always on. */
export const RIDER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
