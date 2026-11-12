import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { MemoryRepo } from "../growth/memoryRepo";
import { walletPath } from "../../lib/shop/growth/ledger";
import { createTopup, topupPath, type OrderFacts, type TopupDeps } from "../../lib/shop/wallet/topups";
import { recheckHeldTopup, verifyTopupPayment, type PaymentFacts, type VerifyDeps } from "../../lib/shop/wallet/verify";
import { parseRecheckBody, statusFor, topupsEnabled, type RecheckOutcome } from "../../lib/shop/wallet/recheck";
import { internalSecret, signInternalRequest, verifyInternalRequest } from "../../lib/shop/refunds";

const T0 = Date.UTC(2026, 10, 7, 4, 30);
const KEY_ID = "rzp_test_stub_key";
const SECRET = "w".repeat(40);

// Checkout signature check, injected so the test does not load the Razorpay helper (which needs a server build).
const sign = (orderId: string, paymentId: string) => createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");
const verifySignature = (o: string, p: string, s: string) => s === sign(o, p);

let repo: MemoryRepo;
let payments: Record<string, PaymentFacts | null>;
let orderN: number;

beforeEach(() => {
  repo = new MemoryRepo();
  payments = {};
  orderN = 0;
});

const topupDeps = (): TopupDeps => ({
  repo: repo as never,
  now: T0,
  keyId: KEY_ID,
  createOrder: async (rupees: number): Promise<OrderFacts> => {
    orderN++;
    return { id: `order_rc${String(orderN).padStart(6, "0")}`, amount: rupees * 100, currency: "INR" };
  },
});

const verifyDeps = (): VerifyDeps => ({
  repo: repo as never,
  now: T0,
  verifySignature,
  fetchPayment: async (id) => payments[id] ?? null,
});

const captured = (paymentId: string, orderId: string, paise: number): PaymentFacts => ({ id: paymentId, order_id: orderId, amount: paise, currency: "INR", status: "captured" });

const balance = (uid: string) => (repo.data(walletPath(uid))?.balance as number | undefined) ?? 0;
const topupRec = (id: string) => repo.data(topupPath(id)) ?? {};

// A top-up for Rs 500 whose first capture was underpaid, so the capture is held (AMOUNT_MISMATCH).
async function heldTopup(uid: string, paymentId: string) {
  const r = await createTopup(topupDeps(), { uid, amount: 500 });
  if (!r.ok) throw new Error(`createTopup refused: ${r.code}`);
  const orderId = r.payment.razorpayOrderId;
  payments[paymentId] = captured(paymentId, orderId, 49_900);
  const res = await verifyTopupPayment(verifyDeps(), { uid, orderId, paymentId, signature: sign(orderId, paymentId) });
  assert.equal(res.ok === false && res.code, "AMOUNT_MISMATCH");
  assert.equal(topupRec(r.topupId).hold, "AMOUNT_MISMATCH");
  return { topupId: r.topupId, orderId, coins: r.coins as number };
}

describe("re-checking a held capture", () => {
  test("while Razorpay still shows the wrong amount the hold stands and nothing is credited", async () => {
    const h = await heldTopup("cust-1", "pay_HOLD0001");
    const out = await recheckHeldTopup(verifyDeps(), { captureId: "pay_HOLD0001" });
    assert.deepEqual(out, { outcome: "STILL_HELD", topupId: h.topupId, reason: "AMOUNT_MISMATCH" });
    assert.equal(balance("cust-1"), 0);
  });

  test("when the payment now matches, the coins are credited once", async () => {
    const h = await heldTopup("cust-1", "pay_HOLD0002");
    payments["pay_HOLD0002"] = captured("pay_HOLD0002", h.orderId, 50_000);
    const out = (await recheckHeldTopup(verifyDeps(), { captureId: "pay_HOLD0002" })) as Extract<RecheckOutcome, { outcome: "CREDITED" }>;
    assert.equal(out.outcome, "CREDITED");
    assert.equal(out.alreadyCredited, false);
    assert.equal(out.coins, h.coins);
    assert.equal(balance("cust-1"), h.coins);
    assert.equal(topupRec(h.topupId).status, "PAID");
  });

  test("a second re-check, by capture or by top-up id, does not credit again", async () => {
    const h = await heldTopup("cust-1", "pay_HOLD0003");
    payments["pay_HOLD0003"] = captured("pay_HOLD0003", h.orderId, 50_000);
    await recheckHeldTopup(verifyDeps(), { captureId: "pay_HOLD0003" });
    const byTopup = await recheckHeldTopup(verifyDeps(), { topupId: h.topupId });
    assert.deepEqual(byTopup, { outcome: "CREDITED", topupId: h.topupId, coins: h.coins, balance: h.coins, alreadyCredited: true });
    // The hold was cleared on credit, so the capture id no longer finds a held top-up.
    const byCapture = await recheckHeldTopup(verifyDeps(), { captureId: "pay_HOLD0003" });
    assert.equal(byCapture.outcome, "REFUSED");
    assert.equal(balance("cust-1"), h.coins);
    const entries = [...repo.docs.keys()].filter((p) => p.startsWith("wallets/cust-1/ledger/"));
    assert.equal(entries.length, 1);
  });

  test("when Razorpay cannot confirm the payment, the top-up stays held", async () => {
    const h = await heldTopup("cust-1", "pay_HOLD0004");
    payments["pay_HOLD0004"] = null;
    const out = await recheckHeldTopup(verifyDeps(), { topupId: h.topupId });
    assert.deepEqual(out, { outcome: "STILL_HELD", topupId: h.topupId, reason: "PAYMENT_UNCONFIRMED" });
    assert.equal(balance("cust-1"), 0);
  });

  test("a payment for another order is refused and not credited", async () => {
    const h = await heldTopup("cust-1", "pay_HOLD0005");
    payments["pay_HOLD0005"] = captured("pay_HOLD0005", "order_elsewhere01", 50_000);
    const out = await recheckHeldTopup(verifyDeps(), { topupId: h.topupId });
    assert.equal(out.outcome === "REFUSED" && out.code, "ORDER_MISMATCH");
    assert.equal(balance("cust-1"), 0);
  });

  test("a top-up with no held payment is refused as NOT_HELD", async () => {
    const r = await createTopup(topupDeps(), { uid: "cust-2", amount: 500 });
    if (!r.ok) throw new Error("setup");
    const out = await recheckHeldTopup(verifyDeps(), { topupId: r.topupId });
    assert.equal(out.outcome === "REFUSED" && out.code, "NOT_HELD");
  });

  test("an unknown top-up or capture id is NOT_FOUND (HTTP 404)", async () => {
    const byTopup = await recheckHeldTopup(verifyDeps(), { topupId: "0123456789abcdef01234567" });
    const byCapture = await recheckHeldTopup(verifyDeps(), { captureId: "pay_NOPE0001" });
    assert.equal(byTopup.outcome === "REFUSED" && byTopup.code, "NOT_FOUND");
    assert.equal(byCapture.outcome === "REFUSED" && byCapture.code, "NOT_FOUND");
    assert.equal(statusFor(byTopup), 404);
  });

  test("the HTTP status follows the outcome: 200 for credited or still held, 409 for refused", () => {
    assert.equal(statusFor({ outcome: "STILL_HELD", topupId: "t", reason: "BALANCE_CAP" }), 200);
    assert.equal(statusFor({ outcome: "CREDITED", topupId: "t", coins: 1, balance: 1, alreadyCredited: true }), 200);
    assert.equal(statusFor({ outcome: "REFUSED", topupId: "t", code: "ORDER_MISMATCH", error: "x" }), 409);
  });
});

describe("recheck request body and gate", () => {
  test("accepts exactly one of captureId or topupId", () => {
    assert.deepEqual(parseRecheckBody({ captureId: "pay_HOLD0001" }), { ok: true, value: { captureId: "pay_HOLD0001" } });
    assert.deepEqual(parseRecheckBody({ topupId: "0123456789abcdef01234567" }), { ok: true, value: { topupId: "0123456789abcdef01234567" } });
    assert.equal(parseRecheckBody({}).ok, false);
    assert.equal(parseRecheckBody({ captureId: "pay_HOLD0001", topupId: "0123456789abcdef01234567" }).ok, false);
  });

  test("rejects malformed ids", () => {
    assert.equal(parseRecheckBody({ captureId: "order_HOLD0001" }).ok, false);
    assert.equal(parseRecheckBody({ topupId: "not-a-topup-id" }).ok, false);
    assert.equal(parseRecheckBody({ topupId: 42 }).ok, false);
  });

  test("refuses unless WALLET_TOPUP_ENABLED is exactly \"true\"", () => {
    assert.equal(topupsEnabled({}), false);
    assert.equal(topupsEnabled({ WALLET_TOPUP_ENABLED: "false" }), false);
    assert.equal(topupsEnabled({ WALLET_TOPUP_ENABLED: "1" }), false);
    assert.equal(topupsEnabled({ WALLET_TOPUP_ENABLED: "true" }), true);
  });

  test("a recheck call is signed like the other internal routes: wrong secret and tampered body are refused", () => {
    const raw = JSON.stringify({ captureId: "pay_HOLD0001" });
    const ts = String(T0);
    const good = signInternalRequest(SECRET, ts, raw);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: SECRET }) !== null, true);
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: good, rawBody: raw, now: T0 }), { ok: true });
    assert.equal(verifyInternalRequest({ secret: "z".repeat(40), timestamp: ts, signature: good, rawBody: raw, now: T0 }).ok, false);
    const tampered = raw.replace("HOLD0001", "HOLD0002");
    assert.equal(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: good, rawBody: tampered, now: T0 }).ok, false);
  });
});
