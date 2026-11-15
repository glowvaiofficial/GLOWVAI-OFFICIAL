import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  UNCONFIRMED_MESSAGE,
  confirmPayment,
  outcomeFromOrderStatus,
  verifyIsRetryable,
  type OrderStatusAnswer,
  type VerifyAnswer,
} from "../../glowvai-app/features/commerce/lib/paymentRecheck";

const lost: VerifyAnswer = { ok: false, status: 0, orderId: null, error: "We could not reach GlowVai." };
const confirmed: VerifyAnswer = { ok: true, status: 200, orderId: "GV-1", error: null };

function deps(verifyAnswers: VerifyAnswer[], order: OrderStatusAnswer) {
  const calls = { verify: 0, order: 0, waits: [] as number[] };
  return {
    calls,
    deps: {
      verify: async () => verifyAnswers[Math.min(calls.verify++, verifyAnswers.length - 1)],
      readOrderStatus: async () => {
        calls.order++;
        return order;
      },
      wait: async (ms: number) => {
        calls.waits.push(ms);
      },
      retryDelaysMs: [10, 20],
    },
  };
}

describe("after Razorpay Checkout: confirming the payment", () => {
  test("only a lost answer or a server error is retried", () => {
    assert.equal(verifyIsRetryable(0), true);
    assert.equal(verifyIsRetryable(503), true);
    assert.equal(verifyIsRetryable(400), false);
    assert.equal(verifyIsRetryable(404), false);
  });

  test("verify answers: placed, without reading the order", async () => {
    const d = deps([confirmed], { ok: true, status: 200, orderStatus: "PLACED" });
    assert.deepEqual(await confirmPayment("GV-1", d.deps), { kind: "placed", orderId: "GV-1" });
    assert.equal(d.calls.order, 0);
  });

  test("a lost verify answer is retried and can then succeed", async () => {
    const d = deps([lost, confirmed], { ok: false, status: 0, orderStatus: null });
    assert.deepEqual(await confirmPayment("GV-1", d.deps), { kind: "placed", orderId: "GV-1" });
    assert.deepEqual(d.calls.waits, [10]);
  });

  test("verify never answers but the order is placed (webhook confirmed it): placed, the bag can be cleared", async () => {
    const d = deps([lost], { ok: true, status: 200, orderStatus: "PLACED" });
    assert.deepEqual(await confirmPayment("GV-1", d.deps), { kind: "placed", orderId: "GV-1" });
    assert.equal(d.calls.verify, 3);
    assert.equal(d.calls.order, 1);
  });

  test("verify never answers and the order still waits: unconfirmed, never shown as a plain failure", async () => {
    const d = deps([lost], { ok: true, status: 200, orderStatus: "PAYMENT_PENDING" });
    assert.deepEqual(await confirmPayment("GV-1", d.deps), { kind: "unconfirmed", message: UNCONFIRMED_MESSAGE });
  });

  test("the order cannot be read either: unconfirmed", async () => {
    const d = deps([lost], { ok: false, status: 0, orderStatus: null });
    assert.equal((await confirmPayment("GV-1", d.deps)).kind, "unconfirmed");
  });

  test("the server refused the payment: failed with its message, no retry", async () => {
    const refused: VerifyAnswer = { ok: false, status: 400, orderId: null, error: "We could not confirm this payment." };
    const d = deps([refused], { ok: true, status: 200, orderStatus: "PLACED" });
    assert.deepEqual(await confirmPayment("GV-1", d.deps), { kind: "failed", message: "We could not confirm this payment." });
    assert.equal(d.calls.verify, 1);
    assert.equal(d.calls.order, 0);
  });

  test("order statuses: anything past payment counts as placed; a closed order is a failure", () => {
    assert.equal(outcomeFromOrderStatus("GV-1", { ok: true, status: 200, orderStatus: "VENDOR_ACCEPTED" }).kind, "placed");
    assert.equal(outcomeFromOrderStatus("GV-1", { ok: true, status: 200, orderStatus: "CANCELLED" }).kind, "failed");
    assert.equal(outcomeFromOrderStatus("GV-1", { ok: true, status: 200, orderStatus: null }).kind, "unconfirmed");
  });
});
