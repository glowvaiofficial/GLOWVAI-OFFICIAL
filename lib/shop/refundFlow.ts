// The refund steps, independent of Firestore and of Razorpay so they can be tested with fakes.
//
// 1. In one transaction: check the order, and save the refund as REQUESTED (or find the earlier one for this requestId).
// 2. Ask Razorpay to refund (or, for an earlier request whose outcome is unknown, look it up first).
// 3. In a second transaction: save Razorpay's answer, the payment status, updatedAt and an event.
// A repeat with the same requestId returns the saved result and never refunds twice.
import {
  describeRefund,
  mergeRefund,
  planRefund,
  refundablePaise,
  refundPatch,
  refundsOf,
  toRupees,
  type CreateRefundResult,
  type RazorpayRefund,
  type RefundEntry,
  type RefundRequest,
} from "./refunds";

type Row = Record<string, unknown>;

export interface RefundStore {
  // Reads the order and writes fn's patch (if any) atomically. fn may run more than once (transaction retries).
  update<T>(orderId: string, fn: (order: Row | null) => { result: T; patch?: Row | null }): Promise<T>;
}

export interface RefundProvider {
  create(paymentId: string, input: { amountPaise: number; orderId: string; requestId: string; reason: string }): Promise<CreateRefundResult>;
  find(paymentId: string, requestId: string): Promise<RazorpayRefund | null | undefined>;
}

export interface RefundResponse {
  status: number;
  body: Row;
}

// A REQUESTED refund younger than this may still be on its way to Razorpay, so it is not sent again yet.
export const IN_FLIGHT_MS = 60_000;

function respond(entry: RefundEntry, order: Row | null): RefundResponse {
  const payment = (order?.payment ?? {}) as Row;
  const common = {
    refund: {
      requestId: entry.requestId,
      razorpayRefundId: entry.razorpayRefundId,
      amount: entry.amount,
      status: entry.status,
      reason: entry.reason,
      at: entry.at,
      error: entry.error,
    },
    paymentStatus: payment.status ?? null,
    refundable: order ? toRupees(refundablePaise(order)) : null,
  };
  if (entry.status === "PENDING" || entry.status === "PROCESSED") return { status: 200, body: { ok: true, ...common } };
  if (entry.status === "FAILED") return { status: 502, body: { ok: false, code: "REFUND_FAILED", error: entry.error || "Razorpay refused the refund.", ...common } };
  return { status: 202, body: { ok: false, code: "REFUND_IN_PROGRESS", error: "This refund is still being sent to Razorpay. Try again in a minute with the same requestId.", ...common } };
}

async function save(store: RefundStore, orderId: string, requestId: string, update: { razorpayRefundId?: string | null; status: RefundEntry["status"]; error?: string | null }, now: number): Promise<RefundResponse> {
  return store.update(orderId, (order) => {
    const refunds = refundsOf(order);
    const index = refunds.findIndex((r) => r.requestId === requestId);
    if (!order || index < 0) return { result: { status: 500, body: { ok: false, code: "REFUND_LOST", error: "The refund record disappeared while it was being saved." } } };
    const entry = mergeRefund(refunds[index], update, now);
    const next = refunds.map((r, i) => (i === index ? entry : r));
    const patch = refundPatch(order, next, now, describeRefund(entry));
    const after: Row = { ...order, refunds: next, payment: { ...((order.payment ?? {}) as Row), status: patch["payment.status"] ?? (order.payment as Row | undefined)?.status } };
    return { result: respond(entry, after), patch };
  });
}

async function send(store: RefundStore, provider: RefundProvider, req: RefundRequest, paymentId: string, now: () => number): Promise<RefundResponse> {
  const result = await provider.create(paymentId, { amountPaise: req.amountPaise, orderId: req.orderId, requestId: req.requestId, reason: req.reason });
  if (result.ok) return save(store, req.orderId, req.requestId, { razorpayRefundId: result.refund.id, status: result.refund.status }, now());
  if (result.definite) return save(store, req.orderId, req.requestId, { status: "FAILED", error: result.message }, now());
  // Razorpay may or may not have made the refund. The entry stays REQUESTED and a retry looks it up before sending again.
  return {
    status: 502,
    body: { ok: false, code: "OUTCOME_UNKNOWN", error: "Razorpay did not confirm the refund. Retry with the same requestId; it will not refund twice." },
  };
}

export async function processRefund(req: RefundRequest, deps: { store: RefundStore; provider: RefundProvider; now?: () => number }): Promise<RefundResponse> {
  const now = deps.now ?? Date.now;
  const step = await deps.store.update(req.orderId, (order) => {
    const plan = planRefund(order, req, now());
    if (plan.kind === "create" && order) {
      const next = [...refundsOf(order), plan.entry];
      return { result: { plan, order }, patch: refundPatch(order, next, now(), describeRefund(plan.entry)) };
    }
    return { result: { plan, order } };
  });
  const { plan, order } = step;
  if (plan.kind === "error") {
    return { status: plan.status, body: { ok: false, code: plan.code, error: plan.message, ...(plan.refundable !== undefined ? { refundable: plan.refundable } : {}) } };
  }
  if (plan.kind === "create") return send(deps.store, deps.provider, req, plan.paymentId, now);

  // A repeat of an earlier request.
  const entry = plan.entry;
  if (entry.status !== "REQUESTED") return respond(entry, order);
  const found = await deps.provider.find(plan.paymentId, req.requestId);
  if (found) return save(deps.store, req.orderId, req.requestId, { razorpayRefundId: found.id, status: found.status }, now());
  if (found === undefined || now() - Number(entry.at) < IN_FLIGHT_MS) return respond(entry, order);
  return send(deps.store, deps.provider, req, plan.paymentId, now);
}
