// Pure rules for SMS OTP sign-in (no server imports, so they are unit-tested alone). Codes are never stored: only an
// HMAC-SHA256 of phone+code under a server secret. Nothing here logs a code or a full phone number.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { indianE164, OTP_LENGTH } from "../shop/account/rules";

export const OTP_COLLECTION = "otp_challenges";
export const EXPIRES_IN_SECONDS = 5 * 60;
export const COOLDOWN_SECONDS = 30;
export const MAX_VERIFY_ATTEMPTS = 5;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const OTP_LIMITS = {
  phonePerHour: { max: 5, windowMs: HOUR },
  phonePerDay: { max: 10, windowMs: DAY },
  ipPerHour: { max: 10, windowMs: HOUR },
  ipPerDay: { max: 30, windowMs: DAY },
  verifyIpPerHour: { max: 30, windowMs: HOUR },
  defaultDailyCap: 300,
} as const;

// "+919876543210" from any common Indian spelling, or null when it is not a valid mobile number (starts 6-9, 10 digits).
export function normalisePhone(input: unknown): string | null {
  return indianE164(input);
}

export function maskPhone(e164: string): string {
  return `+91 ***** ${e164.slice(-4)}`;
}

export function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

// Document id: a keyed hash, so the collection holds no phone numbers.
export function phoneHash(e164: string, secret: string): string {
  return createHmac("sha256", secret).update(`phone:${e164}`).digest("hex");
}

export function codeHash(e164: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`code:${e164}:${code}`).digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export function dailyCap(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : OTP_LIMITS.defaultDailyCap;
}

export interface Challenge {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
  lastSentAt: number;
}

// Seconds left before another code may be sent to this number (0 = may send).
export function cooldownLeft(lastSentAt: number | undefined, now: number): number {
  if (typeof lastSentAt !== "number" || !Number.isFinite(lastSentAt)) return 0;
  return Math.max(0, Math.ceil((lastSentAt + COOLDOWN_SECONDS * 1000 - now) / 1000));
}

export function newChallenge(hash: string, now: number): Challenge {
  return { codeHash: hash, expiresAt: now + EXPIRES_IN_SECONDS * 1000, attempts: 0, createdAt: now, lastSentAt: now };
}

export type AttemptOutcome =
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "locked" }
  | { kind: "wrong"; attemptsLeft: number }
  | { kind: "ok" };

// Decides one verify attempt. The caller stores attempts+1 on "wrong" and deletes the document on "ok" and "expired".
export function judgeAttempt(c: Challenge | undefined, candidateHash: string, now: number): AttemptOutcome {
  if (!c || typeof c.codeHash !== "string") return { kind: "missing" };
  if (!(now < c.expiresAt)) return { kind: "expired" };
  if (!(c.attempts < MAX_VERIFY_ATTEMPTS)) return { kind: "locked" };
  if (hashesMatch(c.codeHash, candidateHash)) return { kind: "ok" };
  return { kind: "wrong", attemptsLeft: MAX_VERIFY_ATTEMPTS - (c.attempts + 1) };
}

export const SMS_TEXT = (code: string) => `Your GlowVai code is ${code}. Do not share it. It expires in 5 minutes.`;
