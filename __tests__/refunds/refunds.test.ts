import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRefundEvent,
  capturedPaise,
  committedPaise,
  createRazorpayRefund,
  internalSecret,
  parseRefundRequest,
  paymentStatusAfter,
  planRefund,
  refundablePaise,
  signInternalRequest,
  verifyInternalRequest,
  type RefundEntry,
} from "../../lib/shop/refunds";

const SECRET = "s".repeat(40);
const NOW = 1_762_400_000_000;

const entry = (extra: Partial<RefundEntry> = {}): RefundEntry => ({
  requestId: "req-00000001",
  razorpayRefundId: "rfnd_1",
  amount: 100,
  amountPaise: 10000,
  status: "PROCESSED",
  reason: "Damaged",
  at: NOW,
  updatedAt: NOW,
  error: null,
  source: "admin",
  ...extra,
});

const onlineOrder = (extra: Record<string, unknown> = {}) => ({
  orderId: "GV-261106-ABC123",
  pricing: { grandTotal: 1587.5 },
  payment: { method: "ONLINE", status: "PAID", transactionId: "pay_123", paymentId: "pay_123" },
  events: [],
  ...extra,
});

describe("internal request signature", () => {
  const body = JSON.stringify({ orderId: "GV-1", amount: 10, reason: "x", requestId: "req-00000001" });
  const ts = String(NOW);
  const sig = signInternalRequest(SECRET, ts, body);

  test("a valid signature passes", () => {
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig, rawBody: body, now: NOW + 1000 }), { ok: true });
  });
  test("upper-case hex is accepted", () => {
    assert.equal(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig.toUpperCase(), rawBody: body, now: NOW }).ok, true);
  });
  test("a signature made with another secret fails", () => {
    const wrong = signInternalRequest("w".repeat(40), ts, body);
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: wrong, rawBody: body, now: NOW }), { ok: false, reason: "BAD_SIGNATURE" });
  });
  test("a timestamp more than 5 minutes off fails, either way", () => {
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig, rawBody: body, now: NOW + 5 * 60_000 + 1 }), { ok: false, reason: "STALE" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig, rawBody: body, now: NOW - 5 * 60_000 - 1 }), { ok: false, reason: "STALE" });
    assert.equal(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig, rawBody: body, now: NOW + 4 * 60_000 }).ok, true);
  });
  test("a tampered body fails", () => {
    const tampered = body.replace('"amount":10', '"amount":1000');
    assert.notEqual(tampered, body);
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sig, rawBody: tampered, now: NOW }), { ok: false, reason: "BAD_SIGNATURE" });
  });
  test("a changed timestamp with the old signature fails", () => {
    const later = String(NOW + 1000);
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: later, signature: sig, rawBody: body, now: NOW }), { ok: false, reason: "BAD_SIGNATURE" });
  });
  test("missing headers or junk signatures fail", () => {
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: null, signature: sig, rawBody: body, now: NOW }), { ok: false, reason: "MISSING" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: "", rawBody: body, now: NOW }), { ok: false, reason: "MISSING" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: "zz", rawBody: body, now: NOW }), { ok: false, reason: "BAD_SIGNATURE" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: "abc", signature: sig, rawBody: body, now: NOW }), { ok: false, reason: "STALE" });
  });
  test("the secret must be at least 32 characters", () => {
    assert.equal(internalSecret({}), null);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: "short" }), null);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: "x".repeat(31) }), null);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: "x".repeat(32) }), "x".repeat(32));
  });
});

describe("refundable amount", () => {
  test("captured amount is the grand total in paise", () => {
    assert.equal(capturedPaise(onlineOrder()), 158750);
    assert.equal(capturedPaise({}), 0);
  });
  test("failed refunds do not count, pending and requested ones do", () => {
    const refunds = [entry({ amountPaise: 10000 }), entry({ requestId: "b", status: "FAILED", amountPaise: 50000 }), entry({ requestId: "c", status: "REQUESTED", amountPaise: 2550 })];
    assert.equal(committedPaise(refunds), 12550);
    assert.equal(refundablePaise(onlineOrder({ refunds })), 158750 - 12550);
  });
  test("an old entry without amountPaise falls back to rupees", () => {
    assert.equal(committedPaise([{ ...entry(), amountPaise: undefined as unknown as number, amount: 12.34 }]), 1234);
  });
  test("never negative", () => {
    assert.equal(refundablePaise(onlineOrder({ refunds: [entry({ amountPaise: 999999 })] })), 0);
  });
  test("payment status follows accepted refunds", () => {
    const order = onlineOrder();
    assert.equal(paymentStatusAfter(order, []), "PAID");
    assert.equal(paymentStatusAfter(order, [entry({ status: "REQUESTED", amountPaise: 158750 })]), "PAID");
    assert.equal(paymentStatusAfter(order, [entry({ status: "PENDING", amountPaise: 100 })]), "PARTIALLY_REFUNDED");
    assert.equal(paymentStatusAfter(order, [entry({ amountPaise: 100000 }), entry({ requestId: "b", amountPaise: 58750 })]), "REFUNDED");
    assert.equal(paymentStatusAfter(order, [entry({ status: "FAILED", amountPaise: 158750 })]), "PAID");
  });
});

describe("refund request validation and plan", () => {
  const req = { orderId: "GV-261106-ABC123", amountPaise: 50000, reason: "Damaged", requestId: "req-00000009" };

  test("body validation", () => {
    assert.deepEqual(parseRefundRequest({ orderId: "GV-1", amount: 12.5, reason: " Too  late ", requestId: "abcdefgh" }), {
      ok: true,
      value: { orderId: "GV-1", amountPaise: 1250, reason: "Too late", requestId: "abcdefgh" },
    });
    assert.equal(parseRefundRequest({ orderId: "GV-1", amount: "12", reason: "x", requestId: "abcdefgh" }).ok, false);
    assert.equal(parseRefundRequest({ orderId: "GV-1", amount: 12.345, reason: "x", requestId: "abcdefgh" }).ok, false);
    assert.equal(parseRefundRequest({ orderId: "GV-1", amount: -1, reason: "x", requestId: "abcdefgh" }).ok, false);
    assert.equal(parseRefundRequest({ orderId: "../x", amount: 1, reason: "x", requestId: "abcdefgh" }).ok, false);
    assert.equal(parseRefundRequest({ orderId: "GV-1", amount: 1, reason: "", requestId: "abcdefgh" }).ok, false);
    assert.equal(parseRefundRequest({ orderId: "GV-1", amount: 1, reason: "x", requestId: "short" }).ok, false);
  });
  test("COD orders are refunded by hand", () => {
    const plan = planRefund({ payment: { method: "COD", status: "PAID" }, pricing: { grandTotal: 500 } }, req, NOW);
    assert.equal(plan.kind === "error" && plan.code, "COD_MANUAL_REFUND");
  });
  test("an online order without a captured payment cannot be refunded", () => {
    const plan = planRefund(onlineOrder({ payment: { method: "ONLINE", status: "PENDING", paymentId: null } }), req, NOW);
    assert.equal(plan.kind === "error" && plan.code, "PAYMENT_NOT_CAPTURED");
  });
  test("a missing order is 404", () => {
    const plan = planRefund(null, req, NOW);
    assert.equal(plan.kind === "error" && plan.status, 404);
  });
  test("more than the remainder is refused with the remainder", () => {
    const plan = planRefund(onlineOrder({ refunds: [entry({ amountPaise: 150000 })] }), req, NOW);
    assert.equal(plan.kind, "error");
    if (plan.kind === "error") {
      assert.equal(plan.code, "AMOUNT_EXCEEDS_REFUNDABLE");
      assert.equal(plan.refundable, 87.5);
    }
  });
  test("exactly the remainder is allowed", () => {
    const plan = planRefund(onlineOrder({ refunds: [entry({ amountPaise: 108750 })] }), req, NOW);
    assert.equal(plan.kind, "create");
    if (plan.kind === "create") {
      assert.equal(plan.paymentId, "pay_123");
      assert.equal(plan.entry.status, "REQUESTED");
      assert.equal(plan.entry.amount, 500);
    }
  });
  test("nothing left once fully refunded", () => {
    const plan = planRefund(onlineOrder({ payment: { method: "ONLINE", status: "REFUNDED", paymentId: "pay_123" }, refunds: [entry({ amountPaise: 158750 })] }), req, NOW);
    assert.equal(plan.kind === "error" && plan.code, "NOTHING_TO_REFUND");
  });
  test("below ₹1 is refused", () => {
    const plan = planRefund(onlineOrder(), { ...req, amountPaise: 50 }, NOW);
    assert.equal(plan.kind === "error" && plan.code, "AMOUNT_TOO_LOW");
  });
  test("a known requestId returns the saved entry; another amount on it is refused", () => {
    const saved = entry({ requestId: req.requestId, amountPaise: 50000, amount: 500 });
    const order = onlineOrder({ refunds: [saved] });
    assert.equal(planRefund(order, req, NOW).kind, "existing");
    const other = planRefund(order, { ...req, amountPaise: 100 }, NOW);
    assert.equal(other.kind === "error" && other.code, "REQUEST_ID_REUSED");
  });
});

describe("Razorpay refund webhook", () => {
  test("refund.processed updates the matching entry and the payment status", () => {
    const order = onlineOrder({ refunds: [entry({ status: "PENDING", amountPaise: 158750, amount: 1587.5 })] });
    const patch = applyRefundEvent(order, "refund.processed", { id: "rfnd_1", payment_id: "pay_123", amount: 158750 }, NOW + 5);
    assert.ok(patch);
    assert.equal((patch.refunds as RefundEntry[])[0].status, "PROCESSED");
    assert.equal(patch["payment.status"], "REFUNDED");
    assert.equal(patch.updatedAt, NOW + 5);
    assert.equal((patch.events as unknown[]).length, 1);
  });
  test("refund.failed frees the amount and puts the payment back to PAID", () => {
    const order = onlineOrder({ payment: { method: "ONLINE", status: "PARTIALLY_REFUNDED", paymentId: "pay_123" }, refunds: [entry({ status: "PENDING" })] });
    const patch = applyRefundEvent(order, "refund.failed", { id: "rfnd_1", payment_id: "pay_123" }, NOW);
    assert.ok(patch);
    assert.equal((patch.refunds as RefundEntry[])[0].status, "FAILED");
    assert.equal(patch["payment.status"], "PAID");
  });
  test("an entry still REQUESTED is matched by notes.requestId", () => {
    const order = onlineOrder({ refunds: [entry({ razorpayRefundId: null, status: "REQUESTED" })] });
    const patch = applyRefundEvent(order, "refund.processed", { id: "rfnd_9", notes: { requestId: "req-00000001", orderId: "GV-261106-ABC123" } }, NOW);
    assert.ok(patch);
    const r = (patch.refunds as RefundEntry[])[0];
    assert.equal(r.razorpayRefundId, "rfnd_9");
    assert.equal(r.status, "PROCESSED");
  });
  test("a repeated event changes nothing; a processed refund is not downgraded", () => {
    const order = onlineOrder({ refunds: [entry({ status: "PROCESSED" })] });
    assert.equal(applyRefundEvent(order, "refund.processed", { id: "rfnd_1" }, NOW), null);
  });
  test("a dashboard refund with no entry is added", () => {
    const patch = applyRefundEvent(onlineOrder(), "refund.processed", { id: "rfnd_dash", amount: 20000 }, NOW);
    assert.ok(patch);
    const r = (patch.refunds as RefundEntry[])[0];
    assert.equal(r.requestId, "razorpay:rfnd_dash");
    assert.equal(r.amount, 200);
    assert.equal(r.source, "razorpay");
    assert.equal(patch["payment.status"], "PARTIALLY_REFUNDED");
  });
});

describe("Razorpay refund call (mocked fetch)", () => {
  const creds = { keyId: "rzp_test_key", secret: "rzp_secret_value" };
  const input = { amountPaise: 50000, orderId: "GV-1", requestId: "req-00000001", reason: "Damaged" };

  test("sends paise, notes and receipt to the payment's refund endpoint", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fake = async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ id: "rfnd_1", status: "processed", amount: 50000 }), { status: 200 });
    };
    const out = await createRazorpayRefund(creds, "pay_123", input, fake);
    assert.deepEqual(out, { ok: true, refund: { id: "rfnd_1", status: "PROCESSED", amountPaise: 50000 } });
    assert.equal(seen[0].url, "https://api.razorpay.com/v1/payments/pay_123/refund");
    const body = JSON.parse(String(seen[0].init.body));
    assert.equal(body.amount, 50000);
    assert.equal(body.receipt, "req-00000001");
    assert.deepEqual(body.notes, { orderId: "GV-1", requestId: "req-00000001", reason: "Damaged" });
    const headers = seen[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Basic " + Buffer.from("rzp_test_key:rzp_secret_value").toString("base64"));
  });
  test("a 4xx is a definite failure, a 5xx or network error is unknown", async () => {
    const bad = await createRazorpayRefund(creds, "pay_1", input, async () => new Response(JSON.stringify({ error: { description: "The amount is invalid" } }), { status: 400 }));
    assert.deepEqual(bad, { ok: false, definite: true, message: "The amount is invalid" });
    const down = await createRazorpayRefund(creds, "pay_1", input, async () => new Response("oops", { status: 503 }));
    assert.equal(down.ok === false && down.definite, false);
    const offline = await createRazorpayRefund(creds, "pay_1", input, async () => {
      throw new Error("ECONNRESET");
    });
    assert.equal(offline.ok === false && offline.definite, false);
  });
  test("the key secret never appears in an error message", async () => {
    const out = await createRazorpayRefund(creds, "pay_1", input, async () => new Response("{}", { status: 401 }));
    assert.equal(out.ok, false);
    if (!out.ok) assert.ok(!out.message.includes(creds.secret));
  });
});
