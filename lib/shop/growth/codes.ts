// Referral codes: generation and format checks. Pure, no server imports.
import { randomBytes } from "node:crypto";
import { GROWTH_CONFIG } from "../growth-config";

const ALPHABET = GROWTH_CONFIG.referral.codeAlphabet;
const LENGTH = GROWTH_CONFIG.referral.codeLength;
const SHAPE = new RegExp(`^[${ALPHABET}]{${LENGTH}}$`);

// Accepts what a customer types: case, spaces and dashes are ignored. Returns "" when the text is not a code shape.
export function normaliseReferralCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.toUpperCase().replace(/[\s-]/g, "");
  return SHAPE.test(cleaned) ? cleaned : "";
}

// A random code. Bytes at or above the largest multiple of the alphabet size are rejected, so every character is equally likely.
export function generateReferralCode(random: (n: number) => Uint8Array = randomBytes): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < LENGTH) {
    for (const b of random(LENGTH * 2)) {
      if (b < limit && out.length < LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}
