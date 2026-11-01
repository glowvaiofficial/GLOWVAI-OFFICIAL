import crypto from "node:crypto";

/**
 * Admin passcode storage and signed session tokens.
 *
 * The passcode is never stored in plain text. ADMIN_PASSCODE_HASH holds
 * "scrypt$<salt>$<hash>" produced by hashPasscode(). Sessions are HMAC-signed
 * with SESSION_SECRET and carried in an httpOnly cookie.
 */

const KEY_LENGTH = 64;

export function hashPasscode(passcode: string, salt: string = crypto.randomBytes(16).toString("hex")): string {
  const hash = crypto.scryptSync(passcode, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(passcode, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

export function signSession(expiresAt: number, secret: string): string {
  const payload = String(expiresAt);
  const sig = crypto.createHmac("sha256", secret).update(`admin:${payload}`).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(`admin:${payload}`).digest("hex");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Date.now() < Number(payload);
}

export const ADMIN_COOKIE = "gv_admin";
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
