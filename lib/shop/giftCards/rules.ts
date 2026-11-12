// GlowVai gift cards: amounts, the code, how a code is stored and checked, and the entry lockout. Pure functions only.
//
// A card code is 16 characters from a 31-character alphabet with no 0, O, 1, I or L (so it reads aloud and copies
// cleanly). The code is shown to the buyer once, at purchase. GlowVai keeps only a salted scrypt hash of it, the card id
// (a hash of the code) and the last four characters. A code cannot be recovered from the database.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { GROWTH_CONFIG } from "../growth-config";

export const GIFT_MIN_RUPEES = 200;
export const GIFT_MAX_RUPEES = 10_000;
export const GIFT_CODE_LENGTH = 16;
// 31 symbols: the digits 2 to 9 and the letters A to Z without I, L and O. Bytes from 248 up are rejected, so every
// symbol is equally likely (248 is 31 times 8).
export const GIFT_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const UNBIASED_BYTE_LIMIT = 248;
export const GIFT_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{16}$/;

export const REDEEM_MAX_ATTEMPTS = 5;
export const REDEEM_WINDOW_MS = 15 * 60 * 1000;
export const PURCHASE_MAX_PER_DAY = 10;

// Whole rupees between the bounds. Strings of digits are accepted (form input); decimals, signs and exponents are not.
export function validateGiftAmount(value: unknown): { ok: true; rupees: number } | { ok: false; error: string } {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : NaN;
  if (!Number.isInteger(n) || n < GIFT_MIN_RUPEES || n > GIFT_MAX_RUPEES) {
    return { ok: false, error: `Choose a whole amount from ₹${GIFT_MIN_RUPEES} to ₹${GIFT_MAX_RUPEES.toLocaleString("en-IN")}.` };
  }
  // A card is worth whole coins, and a coin is worth a fixed number of rupees. The amount must divide evenly.
  if (n % GROWTH_CONFIG.coins.rupeesPerCoin !== 0) return { ok: false, error: "This amount cannot be credited as whole coins." };
  return { ok: true, rupees: n };
}

// Recipient name (2 to 60 letters, spaces, dots, apostrophes, hyphens) and an optional message of up to 200 characters.
// Plain text only: angle brackets and control characters are refused, so nothing can be injected into an email or page.
export function validateGiftDetails(input: { recipientName: unknown; message: unknown }):
  | { ok: true; recipientName: string; message: string }
  | { ok: false; error: string } {
  const name = typeof input.recipientName === "string" ? input.recipientName.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 60 || !/^[\p{L}][\p{L} .'-]*$/u.test(name)) {
    return { ok: false, error: "Enter the recipient's name (2 to 60 letters)." };
  }
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (message.length > 200) return { ok: false, error: "Keep the message to 200 characters or fewer." };
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) return { ok: false, error: "The message can only contain plain text." };
  return { ok: true, recipientName: name, message };
}

// A fresh code. `bytes` is injectable so the tests can check the alphabet and the length.
export function generateGiftCode(bytes: (n: number) => Uint8Array = (n) => randomBytes(n)): string {
  let out = "";
  while (out.length < GIFT_CODE_LENGTH) {
    for (const b of bytes(GIFT_CODE_LENGTH)) {
      if (out.length >= GIFT_CODE_LENGTH) break;
      if (b >= UNBIASED_BYTE_LIMIT) continue;
      out += GIFT_ALPHABET[b % GIFT_ALPHABET.length];
    }
  }
  return out;
}

// What the customer types: spaces, dashes and lower case are ignored. Anything else that is not a code is "".
export function normalizeGiftCode(input: unknown): string {
  if (typeof input !== "string") return "";
  const code = input.replace(/[\s-]/g, "").toUpperCase();
  return GIFT_CODE_PATTERN.test(code) ? code : "";
}

// XXXX-XXXX-XXXX-XXXX, for display only.
export const formatGiftCode = (code: string): string => code.match(/.{1,4}/g)?.join("-") ?? code;

export const lastFourOf = (code: string): string => code.slice(-4);

// The document id of a card: a SHA-256 of the code. The code has about 80 bits of entropy, so the id cannot be used to
// guess a code, and a redemption finds the card with one read.
export function cardIdFor(code: string): string {
  return `gc_${createHash("sha256").update(`glowvai-gift-card|${code}`).digest("hex").slice(0, 32)}`;
}

// Salted scrypt hash of the code. The salt is random per card and stored with it.
export function newCodeSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashGiftCode(code: string, saltHex: string): string {
  return scryptSync(code, Buffer.from(saltHex, "hex"), 32, { N: 16384, r: 8, p: 1 }).toString("hex");
}

// Constant-time comparison of the stored hash with the hash of what was typed.
export function codeMatches(code: string, saltHex: string, expectedHex: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(expectedHex) || !/^[a-f0-9]{32}$/.test(saltHex)) return false;
  const a = Buffer.from(hashGiftCode(code, saltHex), "hex");
  const b = Buffer.from(expectedHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// The ledger key for crediting a card. One card can credit once, however many times the redeem request is retried.
export const giftCardCreditKey = (cardId: string): string => `giftcard:${cardId}`;

export type GiftCardStatus = "ACTIVE" | "REDEEMED";

// Coins credited for a card: the rupee value divided by the rupees per coin (1 at launch, so ₹500 is 500 coins).
export function coinsForCard(rupees: number): number {
  return Math.floor(rupees / GROWTH_CONFIG.coins.rupeesPerCoin);
}
