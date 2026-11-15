// Rules for online orders that are waiting for payment (status PAYMENT_PENDING). Pure functions, plus the coin
// release/retake helpers that run inside a transaction the caller owns (GrowthTx, so the tests use the memory repo).
//
// An online order reserves stock and debits coins when it is created, before the customer pays. These rules make sure
// that hold always ends: the customer can cancel it, it expires after PENDING_PAYMENT_WINDOW_MS, a failed payment gives
// the coins back as well as the stock, and a retry of the same bag reuses the order instead of taking the coins again.
//
// Coins on an order: pricing.coinsRedeemed were debited at checkout (key checkout:{id}). The order then carries
//   coinsReleasedAt    - set while those coins are back in the wallet (cancelled, expired, payment failed), else null
//   coinsReleaseCount  - how many times they were given back
// Each give-back and each take-again has its own ledger key per cycle, and the order (read in the same transaction)
// says which step is due, so running any step twice changes nothing.
import { createHash } from "node:crypto";
import { planLedgerEntry, writeLedgerPlan, numberOr0, walletPath, type LedgerInput } from "./growth/ledger";
import type { GrowthRef, GrowthTx } from "./growth/repo";

// How long an unpaid online order holds its stock and coins.
export const PENDING_PAYMENT_WINDOW_MS = 30 * 60_000;
// How long an Idempotency-Key on POST /api/shop/orders returns the order it first created.
export const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60_000;
export const IDEMPOTENCY_COLLECTION = "order_idempotency";

// Payment states that mean money was taken. An order in one of these is never closed as unpaid.
const SETTLED_PAYMENT = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

export interface PendingOrderLike {
  status?: unknown;
  createdAt?: unknown;
  paymentAttemptAt?: unknown;
  payment?: { method?: unknown; status?: unknown } | null;
  pricing?: { coinsRedeemed?: unknown; grandTotal?: unknown } | null;
  coinsReleasedAt?: unknown;
  coinsReleaseCount?: unknown;
  bagKey?: unknown;
  userId?: unknown;
  razorpayOrderId?: unknown;
}

const millis = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis(): number }).toMillis();
  return null;
};

// True while the order is waiting for an online payment that has not been taken.
export function isUnpaidPending(order: PendingOrderLike): boolean {
  return String(order.status ?? "") === "PAYMENT_PENDING" && !SETTLED_PAYMENT.has(String(order.payment?.status ?? "PENDING"));
}

// When the payment window started: the latest payment attempt (a reuse restarts it), else the creation time.
export function paymentWindowStart(order: PendingOrderLike): number | null {
  const attempt = millis(order.paymentAttemptAt);
  const created = millis(order.createdAt);
  if (attempt !== null && created !== null) return Math.max(attempt, created);
  return attempt ?? created;
}

// An unpaid online order whose window has passed. An order with no readable time is treated as expired (it can only
// be an old or broken record, and holding stock for it forever is the bug this fixes).
export function isPendingExpired(order: PendingOrderLike, now: number, windowMs = PENDING_PAYMENT_WINDOW_MS): boolean {
  if (!isUnpaidPending(order)) return false;
  const start = paymentWindowStart(order);
  return start === null || now - start >= windowMs;
}

// What to do with one of the customer's other PAYMENT_PENDING orders when they place an order.
//  REUSE     - same bag, same total, still inside the window: pay for that order instead of creating a new one
//  EXPIRE    - the window has passed: close it (stock and coins back)
//  SUPERSEDE - a different bag or total: the customer moved on, so close it and free its stock and coins first
//  SKIP      - not an unpaid online order of this customer (already paid, cancelled, or someone else's)
export type PendingDecision = "REUSE" | "EXPIRE" | "SUPERSEDE" | "SKIP";

export function decidePendingOrder(
  order: PendingOrderLike,
  next: { uid: string; bagKey: string; grandTotal: number; online: boolean; now: number },
  windowMs = PENDING_PAYMENT_WINDOW_MS,
): PendingDecision {
  if (String(order.userId ?? "") !== next.uid || !isUnpaidPending(order)) return "SKIP";
  if (isPendingExpired(order, next.now, windowMs)) return "EXPIRE";
  const sameBag = typeof order.bagKey === "string" && order.bagKey !== "" && order.bagKey === next.bagKey;
  const sameTotal = Number(order.pricing?.grandTotal) === next.grandTotal;
  const canPay = typeof order.razorpayOrderId === "string" && order.razorpayOrderId !== "";
  if (next.online && sameBag && sameTotal && canPay) return "REUSE";
  return "SUPERSEDE";
}

// A fingerprint of everything that decides what the order is and costs, so "the same bag" can be recognised on a
// retry. Lines are sorted, so the order of the bag does not matter. The customer's shared location is left out.
export interface BagFingerprintInput {
  paymentMethod: string;
  lines: { productId: string; variantId?: string | null; quantity: number }[];
  addressId: string | null;
  address: Record<string, unknown> | null;
  deliverySlotId: string | null;
  couponCode: string | null | undefined;
  tip: number;
  coinsRequested: number;
}

export function bagFingerprint(input: BagFingerprintInput): string {
  const merged = new Map<string, number>();
  for (const l of input.lines) {
    const key = `${l.productId}::${l.variantId ?? ""}`;
    merged.set(key, (merged.get(key) ?? 0) + Number(l.quantity));
  }
  const lines = [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const address = input.addressId
    ? { id: input.addressId }
    : input.address
      ? Object.fromEntries(Object.entries(input.address).filter(([, v]) => v !== undefined && v !== null && v !== "").sort(([a], [b]) => (a < b ? -1 : 1)))
      : null;
  const canonical = JSON.stringify({
    m: input.paymentMethod,
    l: lines,
    a: address,
    s: input.deliverySlotId ?? null,
    c: (input.couponCode ?? "").trim().toUpperCase(),
    t: input.tip,
    k: input.coinsRequested,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 40);
}

// ---- Idempotency-Key ---------------------------------------------------------------------------------------------

// The header value, when it is usable: 8 to 200 visible ASCII characters. Anything else is ignored (not an error), so a
// client that sends no key, or an odd one, still gets its order.
export function parseIdempotencyKey(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  return /^[\x21-\x7E]{8,200}$/.test(key) ? key : null;
}

// The record id: per customer, so one customer's key can never return another customer's order.
export function idempotencyDocId(uid: string, key: string): string {
  return createHash("sha256").update(`${uid}\n${key}`).digest("hex").slice(0, 40);
}

// The order a stored key points to, when it still counts: same customer and inside the 24 hour window.
export function idempotentOrderId(record: { uid?: unknown; orderId?: unknown; createdAt?: unknown } | undefined | null, uid: string, now: number): string | null {
  if (!record || record.uid !== uid || typeof record.orderId !== "string" || !record.orderId) return null;
  const at = millis(record.createdAt);
  if (at === null || now - at >= IDEMPOTENCY_WINDOW_MS) return null;
  return record.orderId;
}

// ---- Coins held by an order ----------------------------------------------------------------------------------------

export const coinsOnOrder = (order: PendingOrderLike): number => {
  const n = Math.floor(Number(order.pricing?.coinsRedeemed ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const releaseCountOf = (order: PendingOrderLike): number => {
  const n = Math.floor(Number(order.coinsReleaseCount ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// The give-back due on this order, or null when there are no coins or they are already back in the wallet. The first
// give-back keeps the key the cancel route has always used (cancel:{id}), so an order cancelled before this change can
// never be credited a second time.
export function coinsReleasePlan(order: PendingOrderLike, orderId: string): { amount: number; key: string; nextCount: number } | null {
  const amount = coinsOnOrder(order);
  if (amount === 0 || order.coinsReleasedAt) return null;
  const count = releaseCountOf(order);
  return { amount, key: count === 0 ? `cancel:${orderId}` : `cancel:${orderId}:${count}`, nextCount: count + 1 };
}

// The take-again due when a payment arrives for an order whose coins were given back, or null when nothing is due.
export function coinsRetakePlan(order: PendingOrderLike, orderId: string): { amount: number; key: string } | null {
  const amount = coinsOnOrder(order);
  if (amount === 0 || !order.coinsReleasedAt) return null;
  return { amount, key: `retake:${orderId}:${releaseCountOf(order)}` };
}

type RefOf = (path: string) => GrowthRef;

// Reads what the give-back needs (call before any write in the transaction) and returns the writes as `commit`, plus the
// order fields to set. Nothing is due: commit does nothing and the patch is empty.
export async function releaseCoinsTx(
  tx: GrowthTx,
  ref: RefOf,
  order: PendingOrderLike,
  input: { uid: string; orderId: string; reason: string; actor: string; now: number },
): Promise<{ commit: () => void; patch: Record<string, unknown>; credited: number }> {
  const due = coinsReleasePlan(order, input.orderId);
  if (!due) return { commit: () => undefined, patch: {}, credited: 0 };
  const planned = await planLedgerEntry(tx, ref, input.uid, {
    type: "CREDIT",
    source: "ORDER_CANCELLED",
    amount: due.amount,
    idempotencyKey: due.key,
    reason: input.reason,
    orderId: input.orderId,
    actor: input.actor,
  });
  // A credit is only refused for a bad amount or key, which coinsReleasePlan never produces.
  if (!planned.ok) throw new Error(`COINS_RETURN_FAILED:${planned.refusal}`);
  const plan = planned.plan;
  return {
    commit: () => writeLedgerPlan(tx, plan, input.now),
    patch: { coinsReleasedAt: input.now, coinsReleaseCount: due.nextCount },
    credited: plan.duplicate ? 0 : due.amount,
  };
}

// Takes the coins again when a payment arrives for an order whose coins were given back.
//  strict: true  - refuses when the balance is short (a retry of the same bag: the customer is told before paying)
//  strict: false - takes what is there and reports the rest (money was already taken, so the order must go ahead)
export async function retakeCoinsTx(
  tx: GrowthTx,
  ref: RefOf,
  order: PendingOrderLike,
  input: { uid: string; orderId: string; now: number; strict: boolean },
): Promise<{ ok: true; commit: () => void; patch: Record<string, unknown>; taken: number; short: number } | { ok: false; short: number }> {
  const due = coinsRetakePlan(order, input.orderId);
  if (!due) return { ok: true, commit: () => undefined, patch: {}, taken: 0, short: 0 };
  const ledger = (amount: number): LedgerInput => ({
    type: "DEBIT",
    source: "CHECKOUT_REDEMPTION",
    amount,
    idempotencyKey: due.key,
    reason: `Used on order ${input.orderId}`,
    orderId: input.orderId,
    actor: "customer",
  });
  const full = await planLedgerEntry(tx, ref, input.uid, ledger(due.amount));
  if (full.ok) {
    const plan = full.plan;
    return { ok: true, commit: () => writeLedgerPlan(tx, plan, input.now), patch: { coinsReleasedAt: null }, taken: due.amount, short: 0 };
  }
  const wallet = await tx.get(ref(walletPath(input.uid)));
  const balance = Math.max(0, Math.floor(numberOr0(wallet.exists ? wallet.data()?.balance : 0)));
  const short = due.amount - Math.min(balance, due.amount);
  if (input.strict) return { ok: false, short };
  if (balance <= 0) return { ok: true, commit: () => undefined, patch: { coinsReleasedAt: null, coinsShort: short }, taken: 0, short };
  const partial = await planLedgerEntry(tx, ref, input.uid, ledger(balance));
  if (!partial.ok) return { ok: true, commit: () => undefined, patch: { coinsReleasedAt: null, coinsShort: due.amount }, taken: 0, short: due.amount };
  const plan = partial.plan;
  return { ok: true, commit: () => writeLedgerPlan(tx, plan, input.now), patch: { coinsReleasedAt: null, coinsShort: short }, taken: balance, short };
}

// The note left on the order for the team when a late payment could not take all its coins again.
export function coinsShortNote(short: number): string | null {
  return short > 0 ? `${short} coins could not be taken again when the payment arrived (the wallet balance was lower). Review before dispatch.` : null;
}
