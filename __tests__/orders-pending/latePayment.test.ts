import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isClosedUnpaid,
  lateRefundDue,
  lateRefundOutcomePatch,
  lateRefundRequestId,
  latePaymentPatch,
  refundLatePayment,
} from "../../lib/shop/latePayment";
import type { RefundProvider, RefundStore } from "../../lib/shop/refundFlow";
import type { CreateRefundResult } from "../../lib/shop/refunds";

type Row = Record<string, unknown>;
const T = 1_800_000_000_000;

// Applies a Firestore-style patch (dotted keys set nested fields).
function applyPatch(doc: Row, patch: Row): Row {
  const out: Row = JSON.parse(JSON.stringify(doc));
  for (const [key, value] of Object.entries(patch)) {
    const parts = key.split(".");
    let cur = out;
    for (const p of parts.slice(0, -1)) {
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p] as Row;
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

function memoryStore(initial: Row) {
  const docs = new Map<string, Row>([["GV-1", initial]]);
  const store: RefundStore = {
    async update(orderId, fn) {
      const cur = docs.get(orderId) ?? null;
      const { result, patch } = fn(cur ? JSON.parse(JSON.stringify(cur)) : null);
      if (patch && cur) docs.set(orderId, applyPatch(cur, patch));
      return result;
    },
  };
  return { store, get: () => docs.get("GV-1") as Row };
}

function provider(answer: CreateRefundResult) {
  const calls = { create: 0, find: 0, idempotency: [] as string[] };
  const p: RefundProvider = {
    async create(_paymentId, input) {
      calls.create++;
      calls.idempotency.push(input.requestId);
      return answer;
    },
    async find() {
      calls.find++;
      return null;
    },
  };
  return { p, calls };
}

const closedOrder = (): Row => ({
  orderId: "GV-1",
  status: "CANCELLED",
  closedUnpaid: "EXPIRED",
  payment: { method: "ONLINE", status: "PENDING", paymentId: null },
  pricing: { grandTotal: 499, coinsRedeemed: 40 },
  stockReservation: { releasedAt: T - 1000, items: [{ productId: "p1", quantity: 1 }] },
  coinsReleasedAt: T - 1000,
  coinsReleaseCount: 1,
  events: [],
});

const recorded = (o: Row) => applyPatch(o, latePaymentPatch(o, { paymentId: "pay_ABC123", now: T, via: "webhook" }));

describe("late payment on an order closed unpaid", () => {
  test("only a cancelled online order with no settled payment counts as closed unpaid", () => {
    assert.equal(isClosedUnpaid(closedOrder()), true);
    assert.equal(isClosedUnpaid({ ...closedOrder(), status: "PAYMENT_PENDING" }), false);
    assert.equal(isClosedUnpaid({ ...closedOrder(), payment: { method: "COD", status: "PENDING" } }), false);
    assert.equal(isClosedUnpaid({ ...closedOrder(), payment: { method: "ONLINE", status: "PAID" } }), false);
  });

  test("recording it keeps the order cancelled and does not touch stock or coins", () => {
    const o = closedOrder();
    const patch = latePaymentPatch(o, { paymentId: "pay_ABC123", now: T, via: "verify" });
    assert.equal("status" in patch, false);
    assert.equal(Object.keys(patch).some((k) => k.startsWith("stockReservation") || k.startsWith("coins")), false);
    const after = applyPatch(o, patch);
    assert.equal(after.status, "CANCELLED");
    assert.deepEqual(after.stockReservation, o.stockReservation);
    assert.equal(after.coinsReleasedAt, o.coinsReleasedAt);
    assert.equal((after.payment as Row).status, "PAID");
    // A second arrival sees a settled payment, so it is no longer "closed unpaid" and records nothing again.
    assert.equal(isClosedUnpaid(after), false);
    assert.equal(lateRefundDue(after, "pay_ABC123"), true);
    assert.equal(lateRefundDue(after, "pay_OTHER"), false);
  });

  test("the refund request id is fixed per payment", () => {
    assert.equal(lateRefundRequestId("pay_ABC123"), "late-payment:pay_ABC123");
  });

  test("a successful refund records the refund id and amount and clears the review flag", async () => {
    const mem = memoryStore(recorded(closedOrder()));
    const rp = provider({ ok: true, refund: { id: "rfnd_1", status: "PENDING", amountPaise: 49_900 } });
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: rp.p, now: () => T + 1 }), "REFUNDED");
    const o = mem.get();
    assert.deepEqual(o.latePaymentRefunded, { refundId: "rfnd_1", amount: 499, at: T + 1 });
    assert.equal((o.latePayment as Row).status, "REFUNDED");
    assert.equal(o.needsReview, false);
    assert.equal(o.status, "CANCELLED");
    assert.equal((o.payment as Row).status, "REFUNDED");
    assert.deepEqual(rp.calls.idempotency, ["late-payment:pay_ABC123"]);
  });

  test("the webhook and verify both arriving refund once", async () => {
    const mem = memoryStore(recorded(closedOrder()));
    const rp = provider({ ok: true, refund: { id: "rfnd_1", status: "PENDING", amountPaise: 49_900 } });
    await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: rp.p, now: () => T + 1 });
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: rp.p, now: () => T + 2 }), "NOT_DUE");
    assert.equal(rp.calls.create, 1);
    assert.equal((mem.get().refunds as Row[]).length, 1);
  });

  test("a refused refund flags the order for the team and does not throw", async () => {
    const mem = memoryStore(recorded(closedOrder()));
    const rp = provider({ ok: false, definite: true, message: "Insufficient balance" });
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: rp.p, now: () => T + 1 }), "REVIEW");
    const o = mem.get();
    assert.equal(o.needsReview, true);
    assert.equal((o.latePayment as Row).status, "REVIEW");
    assert.match(String(o.reviewReason), /Insufficient balance/);
    assert.equal(o.status, "CANCELLED");
  });

  test("Razorpay not configured: flagged for the team, no call", async () => {
    const mem = memoryStore(recorded(closedOrder()));
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: null, now: () => T + 1 }), "REVIEW");
    assert.equal(mem.get().needsReview, true);
  });

  test("a store or provider error never escapes", async () => {
    const mem = memoryStore(recorded(closedOrder()));
    const broken: RefundProvider = {
      create: async () => {
        throw new Error("socket hang up");
      },
      find: async () => null,
    };
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: broken, now: () => T + 1 }), "REVIEW");
    assert.equal(mem.get().needsReview, true);
  });

  test("an order that never recorded a late payment is not refunded", async () => {
    const mem = memoryStore(closedOrder());
    const rp = provider({ ok: true, refund: { id: "rfnd_1", status: "PENDING", amountPaise: 49_900 } });
    assert.equal(await refundLatePayment("GV-1", "pay_ABC123", { store: mem.store, provider: rp.p }), "NOT_DUE");
    assert.equal(rp.calls.create, 0);
  });

  test("outcome patch for an unknown outcome asks for review with the reason", () => {
    const patch = lateRefundOutcomePatch(recorded(closedOrder()), { status: 502, body: { ok: false, code: "OUTCOME_UNKNOWN", error: "Razorpay did not confirm the refund." } }, T);
    assert.equal(patch.needsReview, true);
    assert.equal((patch.latePayment as Row).reviewCode, "OUTCOME_UNKNOWN");
  });
});
