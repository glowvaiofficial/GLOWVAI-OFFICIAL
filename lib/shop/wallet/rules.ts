// GlowVai Coins wallet rules that need no store: amounts, coins, bounds, the daily cap, expiry, labels and the
// customer-facing projection of ledger entries. No server imports, so the node tests load this file directly.
import { COINS_PER_RUPEE, DAILY_TOPUP_CAP_RUPEES, MAX_BALANCE_COINS, MAX_TOPUP_RUPEES, MIN_TOPUP_RUPEES, TOPUP_EXPIRY_MINUTES } from "../wallet-config";

export type TopupStatus = "CREATED" | "PAID" | "FAILED" | "EXPIRED";
export type TopupHold = "AMOUNT_MISMATCH" | "BALANCE_CAP" | null;

export const coinsForRupees = (rupees: number): number => rupees * COINS_PER_RUPEE;
export const rupeesForCoins = (coins: number): number => Math.floor(Math.max(0, coins) / COINS_PER_RUPEE);
export const paiseForRupees = (rupees: number): number => rupees * 100;

// The customer's amount: a whole number of rupees inside the bounds. Strings are accepted only as plain digits.
export type AmountResult = { ok: true; rupees: number } | { ok: false; code: "NOT_WHOLE_RUPEES" | "BELOW_MIN" | "ABOVE_MAX"; error: string };

export function parseTopupRupees(value: unknown): AmountResult {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d{1,9}$/.test(value.trim()) ? Number(value) : NaN;
  if (!Number.isInteger(n)) return { ok: false, code: "NOT_WHOLE_RUPEES", error: "Enter a whole number of rupees." };
  if (n < MIN_TOPUP_RUPEES) return { ok: false, code: "BELOW_MIN", error: `The smallest top-up is ₹${MIN_TOPUP_RUPEES}.` };
  if (n > MAX_TOPUP_RUPEES) return { ok: false, code: "ABOVE_MAX", error: `The largest top-up is ₹${MAX_TOPUP_RUPEES.toLocaleString("en-IN")}.` };
  return { ok: true, rupees: n };
}

// The calendar day in India (IST, no daylight saving), used for the daily top-up cap.
export function istDayKey(now: number): string {
  return new Date(now + 19_800_000).toISOString().slice(0, 10);
}

// Rupees of top-ups the customer may still start today. A top-up counts while it is paid or still open (not expired).
export function dailyCapRemaining(usedRupees: number): number {
  return Math.max(0, DAILY_TOPUP_CAP_RUPEES - Math.max(0, usedRupees));
}

// Would a new top-up of `rupees` break the daily cap?
export function exceedsDailyCap(usedRupees: number, rupees: number): boolean {
  return usedRupees + rupees > DAILY_TOPUP_CAP_RUPEES;
}

// Would crediting `coins` take the wallet above the balance cap?
export function exceedsBalanceCap(balance: number, coins: number): boolean {
  return balance + coins > MAX_BALANCE_COINS;
}

// A top-up still CREATED more than TOPUP_EXPIRY_MINUTES after it was made is EXPIRED. Other states are returned as stored.
export function effectiveTopupStatus(stored: TopupStatus, createdAt: number, now: number): TopupStatus {
  if (stored === "CREATED" && now - createdAt > TOPUP_EXPIRY_MINUTES * 60_000) return "EXPIRED";
  return stored;
}

// Rupees a record counts against today's cap: paid ones, and open ones that have not expired.
export function countsAgainstCap(rec: { status: TopupStatus; createdAt: number }, now: number): boolean {
  return rec.status === "PAID" || effectiveTopupStatus(rec.status, rec.createdAt, now) === "CREATED";
}

export const rateLine = (): string => {
  const coinWord = COINS_PER_RUPEE === 1 ? "GlowVai Coin" : "GlowVai Coins";
  return `₹1 = ${COINS_PER_RUPEE} ${coinWord}`;
};

export const coinsForAmountLine = (rupees: number): string => `₹${rupees} gives you ${coinsForRupees(rupees)} Glow Coins`;

export const WALLET_NOTICE = "GlowVai Coins can be used on your next order. They are not cash and cannot be withdrawn.";

export const TOPUP_MESSAGES: Record<TopupStatus | "PENDING" | "NOT_FOUND", string> = {
  CREATED: "Your payment is not complete yet. No coins have been added.",
  PAID: "Payment received. Your Glow Coins have been added to your wallet.",
  FAILED: "The payment failed, so no coins were added. You can try again.",
  EXPIRED: "This top-up expired before it was paid, so no coins were added. Start a new top-up to continue.",
  PENDING: "Payment received. We are confirming it, and your coins will appear shortly.",
  NOT_FOUND: "We could not find this top-up.",
};

// Ledger source -> the label the customer sees. Unknown sources fall back to a neutral label.
const LABELS: Record<string, string> = {
  TOPUP: "Top-up",
  CHECKOUT_REDEMPTION: "Order discount",
  REFERRAL_REFERRER: "Referral reward",
  REFERRAL_REFEREE: "Referral reward",
  GIFT_CARD: "Gift card",
  ADMIN_ADJUSTMENT: "Adjustment by GlowVai",
  ORDER_CANCELLED: "Order cancelled",
  EXPIRY: "Expired",
};
export const ledgerLabel = (source: unknown): string => (typeof source === "string" && LABELS[source]) || "Glow Coins";

// The customer's view of one ledger entry. Only these fields leave the server: no actor, idempotency key, customer id,
// balance snapshot or expiry. Anything not listed here stays internal.
export interface HistoryRow {
  id: string;
  type: "CREDIT" | "DEBIT" | "EXPIRY";
  label: string;
  signed: number;
  amount: number;
  reason: string;
  orderId: string | null;
  createdAt: number;
}

export function projectLedgerEntry(id: string, d: Record<string, unknown>): HistoryRow {
  const type = d.type === "CREDIT" || d.type === "DEBIT" || d.type === "EXPIRY" ? d.type : "DEBIT";
  const amount = typeof d.amount === "number" && Number.isFinite(d.amount) ? Math.abs(d.amount) : 0;
  const signed = type === "CREDIT" ? amount : -amount;
  return {
    id,
    type,
    label: ledgerLabel(d.source),
    signed,
    amount,
    reason: typeof d.reason === "string" ? d.reason.slice(0, 200) : "",
    orderId: typeof d.orderId === "string" ? d.orderId : null,
    createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
  };
}

