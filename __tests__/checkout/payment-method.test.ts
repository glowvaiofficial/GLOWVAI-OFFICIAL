import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  PAY_METHOD_LABEL,
  decidePlacement,
  parsePayMethod,
  toApiPaymentMethod,
} from "../../glowvai-app/features/commerce/lib/paymentMethod";

describe("payment method labels and mapping", () => {
  test("online and cod have their own labels", () => {
    assert.equal(PAY_METHOD_LABEL.online, "UPI / card / netbanking via Razorpay");
    assert.equal(PAY_METHOD_LABEL.cod, "Cash on delivery");
  });

  test("parsePayMethod accepts only the two known methods", () => {
    assert.equal(parsePayMethod("online"), "online");
    assert.equal(parsePayMethod("cod"), "cod");
    assert.equal(parsePayMethod("gpay"), null);
    assert.equal(parsePayMethod(undefined), null);
    assert.equal(parsePayMethod(""), null);
  });

  test("API values map to the server's method names", () => {
    assert.equal(toApiPaymentMethod("online"), "ONLINE");
    assert.equal(toApiPaymentMethod("cod"), "COD");
  });
});

describe("decidePlacement", () => {
  const payment = { provider: "razorpay", razorpayOrderId: "order_1", amount: 3000, currency: "INR" };

  test("online with a Razorpay payment starts payment, never a placed order", () => {
    const d = decidePlacement("online", { ok: true, data: { orderId: "GV-1", payment } });
    assert.equal(d.kind, "razorpay");
  });

  test("online reply without a payment is a failure, not a cash-on-delivery success", () => {
    const d = decidePlacement("online", { ok: true, data: { orderId: "GV-1" } });
    assert.equal(d.kind, "failed");
    if (d.kind === "failed") assert.match(d.error, /Nothing was charged/);
  });

  test("online reply with a payment but no order id is a failure", () => {
    const d = decidePlacement("online", { ok: true, data: { payment } });
    assert.equal(d.kind, "failed");
  });

  test("online server refusal shows the server message", () => {
    const d = decidePlacement("online", { ok: false, error: "Online payment is being set up." });
    assert.deepEqual(d, { kind: "failed", error: "Online payment is being set up." });
  });

  test("cod with an order id is placed", () => {
    const d = decidePlacement("cod", { ok: true, data: { orderId: "GV-2", pricing: { grandTotal: 30 } } });
    assert.deepEqual(d, { kind: "placed", orderId: "GV-2", total: 30 });
  });

  test("cod without an order id is a failure", () => {
    assert.equal(decidePlacement("cod", { ok: true, data: {} }).kind, "failed");
  });

  test("cod refusal falls back to a generic message", () => {
    assert.deepEqual(decidePlacement("cod", { ok: false }), { kind: "failed", error: "The order could not be placed. Try again." });
  });
});
