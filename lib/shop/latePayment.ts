// A Razorpay payment captured for an order that was already closed while unpaid (expired, replaced by a newer order,
// or cancelled by the customer while PAYMENT_PENDING). Owner decision: the order is NOT placed again. It stays
// CANCELLED, its stock and coins are not taken again, and the payment is refunded automatically in full.
//
// Steps (each safe to run twice, so the webhook and /verify can both arrive):
//  1. In the transaction that reads the order: record the payment (payment.status PAID, paymentId) and set
//     latePayment = { paymentId, status: "REFUNDING" }. A second arrival sees the payment settled and changes nothing.
//  2. After the transaction: refund through the shared refund flow (lib/shop/refundFlow.ts) with a request id derived
//     from the payment id. That flow saves the refund as REQUESTED before calling Razorpay, sends Razorpay's own
//     idempotency header, and looks an unknown outcome up before sending again, so the money is never refunded twice.
//  3. Save the outcome: latePaymentRefunded { refundId, amount } on success; otherwise latePayment.status "REVIEW" and
//     needsReview: true with the reason, for the team. Never throws.
// No server-only imports, so the unit tests load it directly.
import { processRefund, type RefundProvider, type RefundResponse, type RefundStore } from "./refundFlow";
import { capturedPaise } from "./refunds";

type Row = Record<string, unknown>;

const SETTLED_PAYMENT = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

// An online order that was closed before its payment was taken.
export function isClosedUnpaid(order: Row | null | undefined): boolean {
  if (!order) return false;
  const payment = (order.payment ?? {}) as Row;
  return String(order.status ?? "") === "CANCELLED" && String(payment.method ?? "") === "ONLINE" && !SETTLED_PAYMENT.has(String(payment.status ?? "PENDING"));
}

export const lateRefundRequestId = (paymentId: string): string => `late-payment:${paymentId}`.slice(0, 100);

export const LATE_REFUND_REASON = "Payment arrived after the order was closed unpaid; refunded automatically";

// Step 1: the order update when the late payment is recorded. The order stays CANCELLED; stock and coins are untouched.
export function latePaymentPatch(order: Row, input: { paymentId: string; now: number; via: "webhook" | "verify" }): Row {
  return {
    "payment.status": "PAID",
    "payment.paymentId": input.paymentId,
    "payment.transactionId": input.paymentId,
    transactionId: input.paymentId,
    latePayment: { paymentId: input.paymentId, at: input.now, via: input.via, status: "REFUNDING" },
    updatedAt: input.now,
    events: [
      ...(Array.isArray(order.events) ? order.events : []),
      { at: input.now, actor: "Payment provider", event: "Payment arrived after the order was closed unpaid. The order stays cancelled and the payment is being refunded." },
    ],
  };
}

// Whether step 2 is still due for this payment on this order (the order as stored after step 1).
export function lateRefundDue(order: Row | null | undefined, paymentId: string): boolean {
  if (!order || String(order.status ?? "") !== "CANCELLED") return false;
  const late = (order.latePayment ?? null) as Row | null;
  return !!late && late.paymentId === paymentId && late.status !== "REFUNDED";
}

// Step 3: the order update for the refund flow's answer.
export function lateRefundOutcomePatch(order: Row, outcome: RefundResponse | { error: string }, now: number): Row {
  const late = { ...((order.latePayment ?? {}) as Row) };
  const events = Array.isArray(order.events) ? order.events : [];
  const refund = "body" in outcome ? ((outcome.body.refund ?? null) as Row | null) : null;
  if ("body" in outcome && outcome.status === 200 && refund) {
    const amount = Number(refund.amount) || 0;
    return {
      latePayment: { ...late, status: "REFUNDED", refundId: refund.razorpayRefundId ?? null, amount, updatedAt: now },
      latePaymentRefunded: { refundId: refund.razorpayRefundId ?? null, amount, at: now },
      needsReview: false,
      updatedAt: now,
    };
  }
  const reason = "body" in outcome ? String(outcome.body.error ?? outcome.body.code ?? "The refund was not confirmed.") : outcome.error;
  const code = "body" in outcome ? String(outcome.body.code ?? "REFUND_NOT_CONFIRMED") : "REFUND_ERROR";
  return {
    latePayment: { ...late, status: "REVIEW", reviewCode: code, reviewReason: reason.slice(0, 300), updatedAt: now },
    needsReview: true,
    reviewReason: `Late payment on a closed order was not refunded automatically: ${reason}`.slice(0, 300),
    updatedAt: now,
    events: [...events, { at: now, actor: "GlowVai refunds", event: `Automatic refund of the late payment needs the team: ${reason}`.slice(0, 300) }],
  };
}

export type LateRefundResult = "REFUNDED" | "REVIEW" | "NOT_DUE" | "IN_PROGRESS";

// Steps 2 and 3. provider is null when Razorpay is not configured: the order is flagged for the team instead.
export async function refundLatePayment(
  orderId: string,
  paymentId: string,
  deps: { store: RefundStore; provider: RefundProvider | null; now?: () => number },
): Promise<LateRefundResult> {
  const now = deps.now ?? Date.now;
  try {
    const order = await deps.store.update(orderId, (o) => ({ result: o }));
    if (!lateRefundDue(order, paymentId) || !order) return "NOT_DUE";
    let outcome: RefundResponse | { error: string };
    if (!deps.provider) {
      outcome = { error: "Razorpay keys are not set on the shop server." };
    } else {
      outcome = await processRefund(
        { orderId, requestId: lateRefundRequestId(paymentId), amountPaise: capturedPaise(order), reason: LATE_REFUND_REASON },
        { store: deps.store, provider: deps.provider, now },
      );
    }
    // Another call (the webhook and verify can overlap) is sending this refund right now: it records the outcome.
    if ("body" in outcome && outcome.body.code === "REFUND_IN_PROGRESS") return "IN_PROGRESS";
    return await deps.store.update(orderId, (o) => {
      if (!o || !lateRefundDue(o, paymentId)) return { result: "NOT_DUE" as const };
      const patch = lateRefundOutcomePatch(o, outcome, now());
      return { result: (patch.needsReview ? "REVIEW" : "REFUNDED") as "REFUNDED" | "REVIEW", patch };
    });
  } catch (err) {
    // Last resort: try to leave the flag; never throw to the webhook or verify.
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      await deps.store.update(orderId, (o) => (o && lateRefundDue(o, paymentId) ? { result: null, patch: lateRefundOutcomePatch(o, { error: message }, now()) } : { result: null }));
    } catch {
      // Nothing more can be done here; the order still shows latePayment.status REFUNDING for the team.
    }
    return "REVIEW";
  }
}
