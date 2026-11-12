// Confirms a top-up payment. Two entry points share one credit function (creditTopup in topups.ts):
//  - verifyTopupPayment: the browser reports a Checkout success (order, payment, signature). The signature is checked,
//    then the payment is read from Razorpay, because the browser's word is not enough for the amount.
//  - applyTopupWebhook: Razorpay's own event (payment.captured / payment.failed), signed over the raw body by the route.
// Both are idempotent: a second call for the same top-up credits nothing more.
import type { GrowthRepo } from "../growth/repo";
import { creditTopup, markFailed, readTopup, type CreditResult } from "./topups";
import type { TopupStatus } from "./rules";

export interface PaymentFacts {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface VerifyDeps {
  repo: GrowthRepo;
  now: number;
  verifySignature: (orderId: string, paymentId: string, signature: string) => boolean;
  fetchPayment: (paymentId: string) => Promise<PaymentFacts | null>;
}

export type VerifyResult =
  | { ok: true; status: "PAID"; topupId: string; coins: number; balance: number }
  | { ok: true; status: "PENDING" | "FAILED"; topupId: string }
  | { ok: false; status: number; code: "BAD_SIGNATURE" | "NOT_FOUND" | "PAYMENT_UNCONFIRMED" | "ORDER_MISMATCH" | "AMOUNT_MISMATCH" | "BALANCE_CAP" | "NOT_CAPTURED"; error: string };

// Finds the top-up that owns a Razorpay order. Each order id belongs to one top-up.
async function topupForOrder(repo: GrowthRepo, orderId: string): Promise<{ id: string; uid: string; status: TopupStatus } | null> {
  const rows = await repo.query("walletTopups", [["razorpayOrderId", "==", orderId]], { limit: 1 });
  const snap = rows[0];
  if (!snap) return null;
  const rec = readTopup(snap.id, snap.data() ?? {});
  return { id: rec.id, uid: rec.uid, status: rec.status };
}

const MESSAGES = {
  BAD_SIGNATURE: "We could not confirm this payment. If money was taken, it will be refunded or the top-up completed by our team.",
  NOT_FOUND: "We could not find this top-up.",
  PAYMENT_UNCONFIRMED: "We could not confirm this payment with Razorpay yet. Please check again in a moment.",
  ORDER_MISMATCH: "This payment does not belong to this top-up.",
  AMOUNT_MISMATCH: "The amount paid does not match this top-up, so no coins were added. Our team will review the payment.",
  BALANCE_CAP: "Your wallet is at its limit, so these coins could not be added yet. Our team will review the payment.",
  NOT_CAPTURED: "This payment has not been completed yet.",
} as const;

export async function verifyTopupPayment(
  deps: VerifyDeps,
  input: { uid: string; orderId: string; paymentId: string; signature: string },
): Promise<VerifyResult> {
  if (!deps.verifySignature(input.orderId, input.paymentId, input.signature)) {
    return { ok: false, status: 400, code: "BAD_SIGNATURE", error: MESSAGES.BAD_SIGNATURE };
  }
  const found = await topupForOrder(deps.repo, input.orderId);
  if (!found || found.uid !== input.uid) return { ok: false, status: 404, code: "NOT_FOUND", error: MESSAGES.NOT_FOUND };
  const facts = await deps.fetchPayment(input.paymentId);
  if (!facts) return { ok: false, status: 400, code: "PAYMENT_UNCONFIRMED", error: MESSAGES.PAYMENT_UNCONFIRMED };
  if (facts.order_id !== input.orderId) return { ok: false, status: 409, code: "ORDER_MISMATCH", error: MESSAGES.ORDER_MISMATCH };
  return settle(deps, { topupId: found.id, expectUid: input.uid, orderId: input.orderId, facts });
}

// Webhook: the route has checked the signature over the raw body. Returns null when the order is not a top-up.
export async function applyTopupWebhook(
  deps: VerifyDeps,
  input: { event: string; payment: PaymentFacts },
): Promise<VerifyResult | null> {
  const found = await topupForOrder(deps.repo, input.payment.order_id);
  if (!found) return null;
  if (input.event === "payment.captured") {
    return settle(deps, { topupId: found.id, expectUid: null, orderId: input.payment.order_id, facts: input.payment });
  }
  if (input.event === "payment.failed") {
    await markFailed({ repo: deps.repo, now: deps.now }, { topupId: found.id, reason: "PAYMENT_FAILED", paymentId: input.payment.id, expectUid: null });
    return { ok: true, status: "FAILED", topupId: found.id };
  }
  return null;
}

// Maps a payment's state to a top-up change. Only a captured payment can credit; a failed one marks FAILED.
async function settle(deps: VerifyDeps, input: { topupId: string; expectUid: string | null; orderId: string; facts: PaymentFacts }): Promise<VerifyResult> {
  const { facts } = input;
  if (facts.status === "authorized" || facts.status === "created") {
    return { ok: true, status: "PENDING", topupId: input.topupId };
  }
  if (facts.status === "failed") {
    await markFailed({ repo: deps.repo, now: deps.now }, { topupId: input.topupId, reason: "PAYMENT_FAILED", paymentId: facts.id, expectUid: input.expectUid });
    return { ok: true, status: "FAILED", topupId: input.topupId };
  }
  if (facts.status !== "captured") {
    return { ok: false, status: 409, code: "NOT_CAPTURED", error: MESSAGES.NOT_CAPTURED };
  }
  const result: CreditResult = await creditTopup(
    { repo: deps.repo, now: deps.now },
    { topupId: input.topupId, expectUid: input.expectUid, paymentId: facts.id, orderId: input.orderId, paidPaise: facts.amount, currency: facts.currency },
  );
  if (result.ok) return { ok: true, status: "PAID", topupId: result.topupId, coins: result.coins, balance: result.balance };
  if (result.code === "NOT_FOUND") return { ok: false, status: 404, code: "NOT_FOUND", error: MESSAGES.NOT_FOUND };
  if (result.code === "ORDER_MISMATCH") return { ok: false, status: 409, code: "ORDER_MISMATCH", error: MESSAGES.ORDER_MISMATCH };
  if (result.code === "AMOUNT_MISMATCH") return { ok: false, status: 409, code: "AMOUNT_MISMATCH", error: MESSAGES.AMOUNT_MISMATCH };
  if (result.code === "BALANCE_CAP") return { ok: false, status: 409, code: "BALANCE_CAP", error: MESSAGES.BALANCE_CAP };
  return { ok: false, status: 409, code: "NOT_CAPTURED", error: MESSAGES.NOT_CAPTURED };
}
