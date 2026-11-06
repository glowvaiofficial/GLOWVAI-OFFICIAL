// Salted scrypt hashes for the rider PIN and the customer's delivery code, plus the phone-number hash used to find a
// partner at sign-in. Pure (node:crypto only) so the tests can run it.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

const scryptAsync = (secret: string, salt: Buffer, keylen: number, n: number, r: number, p: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(secret, salt, keylen, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });

const PREFIX = "scrypt1";
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_BYTES = 16;

export const PIN_PATTERN = /^\d{6}$/;
export const CODE_PATTERN = /^\d{4}$/;

/** Hash for storing a PIN or a delivery code: "scrypt1$N$r$p$salt$key". A new random salt every time. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(secret, salt, KEYLEN, N, R, P);
  return [PREFIX, N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

// A well-formed hash that no secret matches. Checked when no partner is found, so a miss takes as long as a wrong PIN.
const DUMMY_HASH = `${PREFIX}$${N}$${R}$${P}$${Buffer.alloc(SALT_BYTES).toString("base64")}$${Buffer.alloc(KEYLEN, 1).toString("base64")}`;

/** True only when the secret matches the stored hash. The comparison is constant time. Malformed input is false. */
export async function verifySecret(secret: string, stored: unknown): Promise<boolean> {
  const parsed = typeof stored === "string" ? parseHash(stored) : null;
  if (!parsed) {
    await scryptAsync(secret, Buffer.alloc(SALT_BYTES), KEYLEN, N, R, P);
    return false;
  }
  const key = await scryptAsync(secret, parsed.salt, parsed.expected.length, parsed.n, parsed.r, parsed.p);
  return key.length === parsed.expected.length && timingSafeEqual(key, parsed.expected);
}

/** Runs one scrypt check against a dummy hash, for the "no such partner" path. Always false. */
export async function burnVerification(secret: string): Promise<false> {
  await verifySecret(secret, DUMMY_HASH);
  return false;
}

function parseHash(stored: string): { n: number; r: number; p: number; salt: Buffer; expected: Buffer } | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return null;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (!Number.isInteger(n) || n < 1024 || n > 1 << 20 || !Number.isInteger(r) || r < 1 || r > 32 || !Number.isInteger(p) || p < 1 || p > 4) return null;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (salt.length < SALT_BYTES || expected.length < 16 || expected.length > 64) return null;
  return { n, r, p, salt, expected };
}

/** Refuses PINs that are trivially guessed: one repeated digit, or a run such as 123456 or 654321. */
export function weakPin(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const steps = [...pin].slice(1).map((c, i) => Number(c) - Number(pin[i]));
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/**
 * The stored lookup key for a partner's phone: SHA-256 of a domain prefix and the 10-digit number. The admin team writes
 * the same value to deliveryPartners/{id}.phoneHash when it creates the partner. `digits` must already be normalised.
 */
export function riderPhoneHash(digits: string): string {
  if (!/^[6-9]\d{9}$/.test(digits)) return "";
  return createHash("sha256").update(`glowvai-rider-phone-v1:${digits}`).digest("hex");
}
