import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  choiceSummary,
  methodPrefillFor,
  payButtonLabel,
  payMethodFor,
  readPaymentChoice,
  sameChoice,
} from "../../glowvai-app/features/commerce/lib/paymentChoice";
import { attemptFor, markPlaced, newAttemptKey, orderSignature, replayDecision } from "../../glowvai-app/features/commerce/lib/orderAttemptKey";
import { parseIdempotencyKey } from "../../lib/shop/pendingPayment";

describe("payment choice", () => {
  test("every online choice goes through Razorpay, cash on delivery does not", () => {
    assert.equal(payMethodFor({ kind: "cod" }), "cod");
    for (const c of [{ kind: "upi", app: "gpay" }, { kind: "card" }, { kind: "netbanking", bank: null }, { kind: "more" }] as const) {
      assert.equal(payMethodFor(c), "online");
    }
  });

  test("the Razorpay window opens on the chosen method", () => {
    assert.deepEqual(methodPrefillFor({ kind: "upi", app: "phonepe" }), { method: "upi" });
    assert.deepEqual(methodPrefillFor({ kind: "card" }), { method: "card" });
    assert.deepEqual(methodPrefillFor({ kind: "netbanking", bank: "HDFC" }), { method: "netbanking", bank: "HDFC" });
    assert.deepEqual(methodPrefillFor({ kind: "netbanking", bank: null }), { method: "netbanking" });
    assert.deepEqual(methodPrefillFor({ kind: "more" }), {});
    assert.deepEqual(methodPrefillFor({ kind: "cod" }), {});
  });

  test("stored choices are read defensively", () => {
    assert.deepEqual(readPaymentChoice({ kind: "upi", app: "evil" }), { kind: "upi", app: null });
    assert.deepEqual(readPaymentChoice({ kind: "netbanking", bank: "SBIN" }), { kind: "netbanking", bank: "SBIN" });
    assert.deepEqual(readPaymentChoice("card"), { kind: "cod" });
    assert.deepEqual(readPaymentChoice(null), { kind: "cod" });
  });

  test("summary and button text", () => {
    assert.equal(choiceSummary({ kind: "cod" }).title, "Cash on Delivery");
    assert.equal(choiceSummary({ kind: "upi", app: "gpay" }).title, "Google Pay (UPI)");
    assert.equal(choiceSummary({ kind: "netbanking", bank: "ICIC" }).title, "Netbanking · ICICI Bank");
    assert.equal(payButtonLabel({ kind: "cod" }, 1297), "Place order · ₹1,297");
    assert.equal(payButtonLabel({ kind: "card" }, 1279), "Pay now ₹1,279");
    assert.ok(sameChoice({ kind: "upi", app: null }, { kind: "upi", app: null }));
    assert.ok(!sameChoice({ kind: "upi", app: null }, { kind: "upi", app: "gpay" }));
  });
});

describe("one order per checkout attempt", () => {
  const body = {
    items: [
      { productId: "b", variantId: null, quantity: 1 },
      { productId: "a", variantId: "v-1", quantity: 2 },
    ],
    addressId: "addr-1",
    deliverySlot: "express",
    couponCode: "GLOW50",
    tip: 10,
    coinsToRedeem: 0,
    paymentMethod: "ONLINE",
  };

  test("keys are accepted by the server", () => {
    const key = newAttemptKey();
    assert.match(key, /^gvw_[0-9a-f]{24}$/);
    assert.equal(parseIdempotencyKey(key), key);
    assert.notEqual(newAttemptKey(), key);
  });

  test("the same request keeps its key; line order does not matter", () => {
    const sig = orderSignature(body);
    const sig2 = orderSignature({ ...body, items: [...body.items].reverse() });
    assert.equal(sig, sig2);
    const first = attemptFor(null, sig, () => "k1-aaaaaaaa");
    assert.equal(attemptFor(first, sig2, () => "k2-bbbbbbbb").key, "k1-aaaaaaaa");
  });

  test("a changed request or a placed attempt gets a new key", () => {
    const first = attemptFor(null, orderSignature(body), () => "k1-aaaaaaaa");
    assert.equal(attemptFor(first, orderSignature({ ...body, tip: 20 }), () => "k2-bbbbbbbb").key, "k2-bbbbbbbb");
    assert.equal(attemptFor(first, orderSignature({ ...body, paymentMethod: "COD" }), () => "k3-cccccccc").key, "k3-cccccccc");
    assert.equal(attemptFor(markPlaced(first), orderSignature(body), () => "k4-dddddddd").key, "k4-dddddddd");
  });

  test("a replayed reply: placed order, payment to open, or start again", () => {
    assert.equal(replayDecision({ orderId: "o1", status: "PLACED" }), null);
    assert.equal(replayDecision({ replayed: true, orderId: "o1", status: "PAYMENT_PENDING", payment: { amount: 100 } }), null);
    assert.equal(replayDecision({ replayed: true, orderId: "o1", status: "PLACED" }), "placed");
    assert.equal(replayDecision({ replayed: true, orderId: "o1", status: "CANCELLED" }), "reset");
    assert.equal(replayDecision({ replayed: true, orderId: "o1", status: "PAYMENT_PENDING" }), "reset");
    assert.equal(replayDecision(null), null);
  });
});
