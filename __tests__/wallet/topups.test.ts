import { register } from "node:module";
import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { MemoryRepo } from "../growth/memoryRepo";
import { ledgerEntryId, ledgerPath, ledgerSum, walletPath } from "../../lib/shop/growth/ledger";
import { MAX_BALANCE_COINS, WALLET_PAGE_SIZE } from "../../lib/shop/wallet-config";
import { createTopup, creditGiftCardCoins, creditTopup, listTopups, markFailed, topupPath, topupStatus, walletHistory, walletSummary, type OrderFacts, type TopupDeps } from "../../lib/shop/wallet/topups";
import { applyTopupWebhook, verifyTopupPayment, type PaymentFacts, type VerifyDeps } from "../../lib/shop/wallet/verify";

// The Razorpay helper imports "server-only" (it throws outside a server build). The stub lets the test load it, and the
// import is dynamic so it runs after the stub is registered (same pattern as variantStock.test.ts).
register("../variants/server-only-stub.mjs", import.meta.url);
const { verifyPaymentSignature, fetchRazorpayPayment } = await import("../../lib/shop/razorpay");

const T0 = Date.UTC(2026, 10, 7, 4, 30); // 10:00 in India
const MIN = 60_000;
const SECRET = "test_key_secret_for_wallet_tests";
const KEY_ID = "rzp_test_stub_key";

process.env.RAZORPAY_KEY_SECRET = SECRET;
process.env.RAZORPAY_KEY_ID = KEY_ID;

// Stubbed Razorpay order creation: records what it was asked, returns a fresh order id.
function orderStub() {
  const calls: Array<{ rupees: number; receipt: string; notes: Record<string, string> }> = [];
  let n = 0;
  const createOrder = async (rupees: number, receipt: string, notes: Record<string, string>): Promise<OrderFacts> => {
    calls.push({ rupees, receipt, notes });
    n++;
    return { id: `order_stub${String(n).padStart(6, "0")}`, amount: rupees * 100, currency: "INR" };
  };
  return { calls, createOrder };
}

// A Razorpay checkout signature, as Razorpay computes it: HMAC-SHA256 of "order|payment" with the key secret.
const sign = (orderId: string, paymentId: string, secret = SECRET) => createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

function paymentStub(payments: Record<string, PaymentFacts>) {
  return async (id: string) => payments[id] ?? null;
}

let repo: MemoryRepo;
let now: number;
let orders: ReturnType<typeof orderStub>;

beforeEach(() => {
  repo = new MemoryRepo();
  now = T0;
  orders = orderStub();
});

const deps = (): TopupDeps => ({ repo: repo as never, now, keyId: KEY_ID, createOrder: orders.createOrder });

async function startTopup(uid: string, amount: unknown) {
  const r = await createTopup(deps(), { uid, amount });
  if (!r.ok) throw new Error(`createTopup refused: ${r.code}`);
  return r;
}

function verifyDeps(payments: Record<string, PaymentFacts>): VerifyDeps {
  return {
    repo: repo as never,
    now,
    verifySignature: verifyPaymentSignature,
    fetchPayment: paymentStub(payments),
  };
}

function capturedPayment(paymentId: string, orderId: string, rupees: number, status = "captured"): PaymentFacts {
  return { id: paymentId, order_id: orderId, amount: rupees * 100, currency: "INR", status };
}

const balance = (uid: string) => (repo.data(walletPath(uid))?.balance as number | undefined) ?? 0;
const ledgerEntries = (uid: string) => [...repo.docs.keys()].filter((p) => p.startsWith(`wallets/${uid}/ledger/`)).map((p) => repo.data(p) as Record<string, unknown>);

describe("creating a top-up", () => {
  test("the Razorpay order carries the amount in paise, the receipt, and the top-up id only in notes", async () => {
    const r = await startTopup("cust-1", 500);
    assert.equal(orders.calls.length, 1);
    const call = orders.calls[0];
    assert.equal(call.rupees, 500);
    assert.equal(call.receipt, `topup:${r.topupId}`);
    assert.deepEqual(call.notes, { topupId: r.topupId });
    assert.equal(r.payment.amount, 50_000);
    assert.equal(r.payment.keyId, KEY_ID);
    assert.equal(r.coins, 500);
    // The browser gets an order id and a key id; the secret is never in the response.
    assert.equal(JSON.stringify(r).includes(SECRET), false);
  });

  test("the stored top-up is CREATED with the amount, the coins and the customer id, and no order twice", async () => {
    const r = await startTopup("cust-1", "250");
    const rec = repo.data(topupPath(r.topupId));
    assert.equal(rec?.status, "CREATED");
    assert.equal(rec?.amountRupees, 250);
    assert.equal(rec?.coins, 250);
    assert.equal(rec?.uid, "cust-1");
    assert.equal(rec?.razorpayOrderId, r.payment.razorpayOrderId);
  });

  test("bad amounts are refused before anything is written", async () => {
    const before = repo.log.length;
    const r = await createTopup(deps(), { uid: "cust-1", amount: 99 });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.code, "BELOW_MIN");
    assert.equal(repo.log.length, before);
    assert.equal(orders.calls.length, 0);
  });

  test("the daily cap: top-ups up to Rs 20,000 in a day, then refused with the remaining amount", async () => {
    await startTopup("cust-1", 10_000);
    await startTopup("cust-1", 10_000);
    const r = await createTopup(deps(), { uid: "cust-1", amount: 100 });
    assert.equal(r.ok === false && r.code, "DAILY_CAP");
    assert.match(r.ok === false ? r.error : "", /You can still add ₹0 today/);
    // The next day is a new allowance.
    now = T0 + 24 * 60 * MIN;
    const next = await createTopup(deps(), { uid: "cust-1", amount: 100 });
    assert.equal(next.ok, true);
    // Another customer has their own allowance.
    const other = await createTopup(deps(), { uid: "cust-2", amount: 10_000 });
    assert.equal(other.ok, true);
  });

  test("the balance cap refuses a top-up that would take the wallet over 50,000 coins", async () => {
    repo.seed(walletPath("cust-1"), { uid: "cust-1", balance: MAX_BALANCE_COINS - 50 });
    const r = await createTopup(deps(), { uid: "cust-1", amount: 100 });
    assert.equal(r.ok === false && r.code, "BALANCE_CAP");
  });

  test("when Razorpay cannot create the order the top-up is FAILED, not left open, and nothing credits", async () => {
    const boom = async () => {
      throw new Error("network");
    };
    const r = await createTopup({ ...deps(), createOrder: boom }, { uid: "cust-1", amount: 300 });
    assert.equal(r.ok === false && r.code, "ORDER_NOT_CREATED");
    const [snap] = [...repo.docs.entries()].filter(([p]) => p.startsWith("walletTopups/")).map(([, d]) => d.data);
    assert.equal(snap?.status, "FAILED");
    assert.equal(snap?.failureReason, "ORDER_NOT_CREATED");
    assert.equal(balance("cust-1"), 0);
  });
});

describe("verify: signature and ownership", () => {
  test("a valid signature for a captured payment credits the coins", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const res = await verifyTopupPayment(verifyDeps({ pay_AAAA1111: capturedPayment("pay_AAAA1111", orderId, 500) }), {
      uid: "cust-1",
      orderId,
      paymentId: "pay_AAAA1111",
      signature: sign(orderId, "pay_AAAA1111"),
    });
    assert.equal(res.ok && res.status, "PAID");
    assert.equal(balance("cust-1"), 500);
  });

  test("an invalid signature is refused, with no write at all", async () => {
    const r = await startTopup("cust-1", 500);
    const before = repo.log.length;
    const res = await verifyTopupPayment(verifyDeps({ pay_AAAA1111: capturedPayment("pay_AAAA1111", r.payment.razorpayOrderId, 500) }), {
      uid: "cust-1",
      orderId: r.payment.razorpayOrderId,
      paymentId: "pay_AAAA1111",
      signature: sign(r.payment.razorpayOrderId, "pay_AAAA1111", "some_other_secret"),
    });
    assert.equal(res.ok === false && res.code, "BAD_SIGNATURE");
    assert.equal(repo.log.length, before);
    assert.equal(balance("cust-1"), 0);
  });

  test("a tampered payment id or order id fails the signature check", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const good = sign(orderId, "pay_AAAA1111");
    assert.equal(verifyPaymentSignature(orderId, "pay_BBBB2222", good), false, "tampered payment id");
    assert.equal(verifyPaymentSignature("order_other0001", "pay_AAAA1111", good), false, "tampered order id");
    assert.equal(verifyPaymentSignature(orderId, "pay_AAAA1111", good.slice(0, -1) + (good.endsWith("0") ? "1" : "0")), false, "tampered signature");
    assert.equal(verifyPaymentSignature(orderId, "pay_AAAA1111", ""), false, "empty signature");
    assert.equal(verifyPaymentSignature(orderId, "pay_AAAA1111", good), true, "untouched signature");
  });

  test("a top-up belonging to someone else is not found for another customer, and nothing credits", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const res = await verifyTopupPayment(verifyDeps({ pay_AAAA1111: capturedPayment("pay_AAAA1111", orderId, 500) }), {
      uid: "cust-2",
      orderId,
      paymentId: "pay_AAAA1111",
      signature: sign(orderId, "pay_AAAA1111"),
    });
    assert.equal(res.ok === false && res.code, "NOT_FOUND");
    assert.equal(balance("cust-1"), 0);
    assert.equal(balance("cust-2"), 0);
  });

  test("an amount paid that differs from the top-up is refused and held, not credited", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const underpaid: PaymentFacts = { id: "pay_AAAA1111", order_id: orderId, amount: 49_900, currency: "INR", status: "captured" };
    const res = await verifyTopupPayment(verifyDeps({ pay_AAAA1111: underpaid }), { uid: "cust-1", orderId, paymentId: "pay_AAAA1111", signature: sign(orderId, "pay_AAAA1111") });
    assert.equal(res.ok === false && res.code, "AMOUNT_MISMATCH");
    assert.equal(balance("cust-1"), 0);
    assert.equal(ledgerEntries("cust-1").length, 0);
    const rec = repo.data(topupPath(r.topupId));
    assert.equal(rec?.hold, "AMOUNT_MISMATCH");
    assert.equal(rec?.status, "CREATED");
  });

  test("a payment for a different order is refused", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const wrongOrder: PaymentFacts = { id: "pay_AAAA1111", order_id: "order_elsewhere01", amount: 50_000, currency: "INR", status: "captured" };
    const res = await verifyTopupPayment(verifyDeps({ pay_AAAA1111: wrongOrder }), { uid: "cust-1", orderId, paymentId: "pay_AAAA1111", signature: sign(orderId, "pay_AAAA1111") });
    assert.equal(res.ok === false && res.code, "ORDER_MISMATCH");
    assert.equal(balance("cust-1"), 0);
  });

  test("a payment Razorpay does not confirm is refused", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const res = await verifyTopupPayment(verifyDeps({}), { uid: "cust-1", orderId, paymentId: "pay_AAAA1111", signature: sign(orderId, "pay_AAAA1111") });
    assert.equal(res.ok === false && res.code, "PAYMENT_UNCONFIRMED");
    assert.equal(balance("cust-1"), 0);
  });
});

describe("credit happens once", () => {
  test("a double verify credits once and returns the same result", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const d = verifyDeps({ pay_AAAA1111: capturedPayment("pay_AAAA1111", orderId, 500) });
    const input = { uid: "cust-1", orderId, paymentId: "pay_AAAA1111", signature: sign(orderId, "pay_AAAA1111") };
    const first = await verifyTopupPayment(d, input);
    const second = await verifyTopupPayment(d, input);
    assert.deepEqual(second, first);
    assert.equal(balance("cust-1"), 500);
    assert.equal(ledgerEntries("cust-1").length, 1);
  });

  test("webhook plus verify credits once, in either order", async () => {
    const r1 = await startTopup("cust-1", 500);
    const o1 = r1.payment.razorpayOrderId;
    const captured = capturedPayment("pay_WEBHK001", o1, 500);
    const d = verifyDeps({ pay_WEBHK001: captured });
    const hook = await applyTopupWebhook(d, { event: "payment.captured", payment: captured });
    assert.equal(hook?.ok && hook.status, "PAID");
    await verifyTopupPayment(d, { uid: "cust-1", orderId: o1, paymentId: "pay_WEBHK001", signature: sign(o1, "pay_WEBHK001") });
    assert.equal(balance("cust-1"), 500);

    // Reverse order: verify first, then a repeated webhook.
    const r2 = await startTopup("cust-2", 250);
    const o2 = r2.payment.razorpayOrderId;
    const captured2 = capturedPayment("pay_WEBHK002", o2, 250);
    const d2 = verifyDeps({ pay_WEBHK002: captured2 });
    await verifyTopupPayment(d2, { uid: "cust-2", orderId: o2, paymentId: "pay_WEBHK002", signature: sign(o2, "pay_WEBHK002") });
    await applyTopupWebhook(d2, { event: "payment.captured", payment: captured2 });
    assert.equal(balance("cust-2"), 250);
    assert.equal(ledgerEntries("cust-2").length, 1);
  });

  test("the credit key is the top-up id, so the same payment can never credit twice through the store", async () => {
    const r = await startTopup("cust-1", 100);
    const first = await creditTopup({ repo: repo as never, now }, { topupId: r.topupId, expectUid: "cust-1", paymentId: "pay_K1", orderId: r.payment.razorpayOrderId, paidPaise: 10_000, currency: "INR" });
    const again = await creditTopup({ repo: repo as never, now: now + MIN }, { topupId: r.topupId, expectUid: "cust-1", paymentId: "pay_K2", orderId: r.payment.razorpayOrderId, paidPaise: 10_000, currency: "INR" });
    assert.equal(first.ok && first.balance, 100);
    assert.deepEqual(again, { ok: true, status: "PAID", topupId: r.topupId, coins: 100, balance: 100, duplicate: true });
    assert.equal(ledgerEntries("cust-1").length, 1);
    assert.equal(ledgerEntries("cust-1")[0]?.idempotencyKey, `topup:${r.topupId}`);
  });
});

describe("failure and expiry", () => {
  test("a failed payment marks the top-up FAILED and never credits", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const failed = { id: "pay_FAIL0001", order_id: orderId, amount: 50_000, currency: "INR", status: "failed" };
    const res = await verifyTopupPayment(verifyDeps({ pay_FAIL0001: failed }), { uid: "cust-1", orderId, paymentId: "pay_FAIL0001", signature: sign(orderId, "pay_FAIL0001") });
    assert.equal(res.ok && res.status, "FAILED");
    assert.equal(repo.data(topupPath(r.topupId))?.status, "FAILED");
    assert.equal(balance("cust-1"), 0);
  });

  test("a payment.failed webhook marks FAILED and never credits", async () => {
    const r = await startTopup("cust-1", 500);
    const d = verifyDeps({});
    const failed: PaymentFacts = { id: "pay_FAIL0002", order_id: r.payment.razorpayOrderId, amount: 50_000, currency: "INR", status: "failed" };
    const res = await applyTopupWebhook(d, { event: "payment.failed", payment: failed });
    assert.equal(res?.ok && res.status, "FAILED");
    assert.equal(repo.data(topupPath(r.topupId))?.status, "FAILED");
    assert.equal(balance("cust-1"), 0);
  });

  test("a customer-reported checkout failure marks FAILED, and a PAID top-up is never downgraded", async () => {
    const r = await startTopup("cust-1", 500);
    const res = await markFailed({ repo: repo as never, now }, { topupId: r.topupId, reason: "CHECKOUT_FAILED", paymentId: null, expectUid: "cust-1" });
    assert.equal(res.ok && res.status, "FAILED");
    assert.equal(balance("cust-1"), 0);

    const paid = await startTopup("cust-1", 100);
    await creditTopup({ repo: repo as never, now }, { topupId: paid.topupId, expectUid: "cust-1", paymentId: "pay_P1", orderId: paid.payment.razorpayOrderId, paidPaise: 10_000, currency: "INR" });
    const after = await markFailed({ repo: repo as never, now }, { topupId: paid.topupId, reason: "CHECKOUT_FAILED", paymentId: null, expectUid: "cust-1" });
    assert.equal(after.ok && after.status, "PAID");
    assert.equal(repo.data(topupPath(paid.topupId))?.status, "PAID");
  });

  test("a top-up still CREATED after 30 minutes is EXPIRED at read time, and a later capture still credits", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    now = T0 + 30 * MIN;
    const still = await topupStatus({ repo: repo as never, now }, { topupId: r.topupId, uid: "cust-1" });
    assert.equal(still.ok && still.status, "CREATED");
    now = T0 + 31 * MIN;
    const expired = await topupStatus({ repo: repo as never, now }, { topupId: r.topupId, uid: "cust-1" });
    assert.equal(expired.ok && expired.status, "EXPIRED");
    assert.equal(repo.data(topupPath(r.topupId))?.status, "EXPIRED", "the expiry is written");
    assert.equal(balance("cust-1"), 0);

    // The money was taken after all: the capture still credits, once.
    const res = await verifyTopupPayment(verifyDeps({ pay_LATE0001: capturedPayment("pay_LATE0001", orderId, 500) }), {
      uid: "cust-1",
      orderId,
      paymentId: "pay_LATE0001",
      signature: sign(orderId, "pay_LATE0001"),
    });
    assert.equal(res.ok && res.status, "PAID");
    assert.equal(balance("cust-1"), 500);
  });

  test("a status check by another customer does not reveal the top-up", async () => {
    const r = await startTopup("cust-1", 500);
    const res = await topupStatus({ repo: repo as never, now }, { topupId: r.topupId, uid: "cust-2" });
    assert.equal(res.ok, false);
  });

  test("a captured payment that would take the wallet over the cap is held, then credits once there is room", async () => {
    const r = await startTopup("cust-1", 100);
    const orderId = r.payment.razorpayOrderId;
    // The wallet fills up after the top-up was made.
    repo.seed(walletPath("cust-1"), { uid: "cust-1", balance: MAX_BALANCE_COINS - 50 });
    const d = verifyDeps({ pay_CAP00001: capturedPayment("pay_CAP00001", orderId, 100) });
    const res = await verifyTopupPayment(d, { uid: "cust-1", orderId, paymentId: "pay_CAP00001", signature: sign(orderId, "pay_CAP00001") });
    assert.equal(res.ok === false && res.code, "BALANCE_CAP");
    assert.equal(repo.data(topupPath(r.topupId))?.hold, "BALANCE_CAP");
    assert.equal(balance("cust-1"), MAX_BALANCE_COINS - 50);

    // Room appears (a debit elsewhere lowers the balance); the next capture credits and clears the hold.
    repo.seed(walletPath("cust-1"), { uid: "cust-1", balance: 1000 });
    const retry = await verifyTopupPayment(d, { uid: "cust-1", orderId, paymentId: "pay_CAP00001", signature: sign(orderId, "pay_CAP00001") });
    assert.equal(retry.ok && retry.status, "PAID");
    assert.equal(balance("cust-1"), 1100);
    assert.equal(repo.data(topupPath(r.topupId))?.hold, null);
  });
});

describe("ledger rules", () => {
  test("every credit is an append-only ledger entry: created once, never updated or deleted", async () => {
    const r = await startTopup("cust-1", 500);
    const orderId = r.payment.razorpayOrderId;
    const d = verifyDeps({ pay_LEDG0001: capturedPayment("pay_LEDG0001", orderId, 500) });
    const input = { uid: "cust-1", orderId, paymentId: "pay_LEDG0001", signature: sign(orderId, "pay_LEDG0001") };
    await verifyTopupPayment(d, input);
    await verifyTopupPayment(d, input);
    await applyTopupWebhook(d, { event: "payment.captured", payment: capturedPayment("pay_LEDG0001", orderId, 500) });
    const entryPath = ledgerPath("cust-1", ledgerEntryId(`topup:${r.topupId}`));
    const writes = repo.log.filter((l) => l.endsWith(entryPath));
    assert.deepEqual(writes, [`create:${entryPath}`]);
    assert.equal(repo.log.some((l) => l.includes("/ledger/") && (l.startsWith("update:") || l.startsWith("set:"))), false);
  });

  test("the balance is never negative and equals the sum of the ledger after a mix of credits and debits", async () => {
    await startTopup("cust-1", 100);
    const r = await startTopup("cust-1", 250);
    const orderId = r.payment.razorpayOrderId;
    await verifyTopupPayment(verifyDeps({ pay_MIX00001: capturedPayment("pay_MIX00001", orderId, 250) }), { uid: "cust-1", orderId, paymentId: "pay_MIX00001", signature: sign(orderId, "pay_MIX00001") });
    await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "CARD-TEST-0001", coins: 75 });
    // A debit larger than the balance is refused by the shared ledger.
    const debit = await import("../../lib/shop/growth/coins").then((m) => m.adjustCoins(repo as never, { uid: "cust-1", amount: -10_000, reason: "Too large for test", actor: "tester", idempotencyKey: "too-large", now }));
    assert.equal(debit.ok, false);
    const entries = ledgerEntries("cust-1") as Array<{ balanceAfter: number }>;
    assert.ok(entries.every((e) => e.balanceAfter >= 0));
    assert.equal(balance("cust-1"), ledgerSum(entries as never));
    // The 100 top-up was never paid, so only the 250 capture and the 75 gift card are in the wallet.
    assert.equal(balance("cust-1"), 250 + 75);
  });

  test("the top-up balance cannot be raised past the cap by the credit path", async () => {
    repo.seed(walletPath("cust-1"), { uid: "cust-1", balance: MAX_BALANCE_COINS });
    const r = await startTopup("cust-1", 100).catch(() => null);
    assert.equal(r, null, "creating is refused at the cap");
    assert.equal(balance("cust-1"), MAX_BALANCE_COINS);
  });
});

describe("gift card hook", () => {
  test("credits once with source GIFT_CARD and the card key", async () => {
    const a = await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "GC-ABCD-1234", coins: 300 });
    const b = await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "GC-ABCD-1234", coins: 300 });
    assert.deepEqual(a, { ok: true, applied: true, balance: 300 });
    assert.deepEqual(b, { ok: true, applied: false, balance: 300 });
    const entry = repo.data(ledgerPath("cust-1", ledgerEntryId("giftcard:GC-ABCD-1234")));
    assert.equal(entry?.source, "GIFT_CARD");
    assert.equal(entry?.type, "CREDIT");
  });

  test("a bad card id or amount is refused", async () => {
    assert.equal((await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "x", coins: 10 })).ok, false);
    assert.equal((await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "GC-OKAY-0001", coins: 0 })).ok, false);
    assert.equal((await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "GC-OKAY-0001", coins: 1.5 })).ok, false);
  });
});

describe("wallet reads", () => {
  test("history: pages of 20, newest first, every row exactly once, in order", async () => {
    for (let i = 0; i < 45; i++) {
      await creditGiftCardCoins({ repo: repo as never, now: T0 + i * 1000 }, { uid: "cust-1", cardId: `GC-PAGE-${String(i).padStart(4, "0")}`, coins: 1 });
    }
    const expected = Array.from({ length: 45 }, (_, i) => T0 + (44 - i) * 1000);
    const seen: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await walletHistory({ repo: repo as never }, { uid: "cust-1", cursor });
      assert.equal(page.ok, true);
      if (!page.ok) return;
      pages++;
      assert.ok(page.rows.length <= WALLET_PAGE_SIZE);
      seen.push(...page.rows.map((r) => r.createdAt));
      cursor = page.nextCursor;
    } while (cursor && pages < 10);
    assert.equal(pages, 3);
    assert.deepEqual(seen, expected, "no row repeated, none skipped, newest first");
  });

  test("history: rows that share a millisecond are neither repeated nor skipped across page boundaries", async () => {
    // 25 entries at the same instant, plus 3 older ones: the page boundary falls inside the tie.
    for (let i = 0; i < 25; i++) {
      await creditGiftCardCoins({ repo: repo as never, now: T0 }, { uid: "cust-1", cardId: `GC-TIE-${String(i).padStart(4, "0")}`, coins: 1 });
    }
    for (let i = 0; i < 3; i++) {
      await creditGiftCardCoins({ repo: repo as never, now: T0 - (i + 1) * 1000 }, { uid: "cust-1", cardId: `GC-OLD-${i}`, coins: 1 });
    }
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await walletHistory({ repo: repo as never }, { uid: "cust-1", cursor });
      assert.equal(page.ok, true);
      if (!page.ok) return;
      pages++;
      ids.push(...page.rows.map((r) => r.id));
      cursor = page.nextCursor;
    } while (cursor && pages < 10);
    assert.equal(pages, 2);
    assert.equal(ids.length, 28, "every row once");
    assert.equal(new Set(ids).size, 28, "no repeats");
  });

  test("history rows carry no internal fields", async () => {
    await creditGiftCardCoins({ repo: repo as never, now }, { uid: "cust-1", cardId: "GC-FIELD-0001", coins: 5 });
    const page = await walletHistory({ repo: repo as never }, { uid: "cust-1", cursor: null });
    assert.equal(page.ok && page.rows.length, 1);
    const row = page.ok ? page.rows[0] : null;
    assert.deepEqual(Object.keys(row ?? {}).sort(), ["amount", "createdAt", "id", "label", "orderId", "reason", "signed", "type"]);
    const text = JSON.stringify(page);
    for (const secretish of ["idempotencyKey", "actor", "balanceAfter", "expiresAt", "cust-1", "giftcard:"]) {
      assert.equal(text.includes(secretish), false, `must not expose ${secretish}`);
    }
    assert.equal(row?.label, "Gift card");
  });

  test("a bad cursor is refused", async () => {
    const r = await walletHistory({ repo: repo as never }, { uid: "cust-1", cursor: "12;drop" });
    assert.equal(r.ok, false);
  });

  test("summary: balance, rate, limits and the notice, all from config", async () => {
    repo.seed(walletPath("cust-1"), { uid: "cust-1", balance: 420 });
    const s = await walletSummary({ repo: repo as never, now }, "cust-1");
    assert.equal(s.balance, 420);
    assert.equal(s.rupeesValue, 420);
    assert.equal(s.rate.line, "₹1 = 1 GlowVai Coin");
    assert.equal(s.limits.dailyCapRupees, 20_000);
    assert.equal(s.limits.maxBalanceCoins, 50_000);
    assert.equal(s.notice, "GlowVai Coins can be used on your next order. They are not cash and cannot be withdrawn.");
  });
});

describe("reconciliation read model", () => {
  test("paid top-ups against ledger credits, with the differences listed", async () => {
    // 1: paid and credited (fine).
    const a = await startTopup("cust-aaaa111", 200);
    await verifyTopupPayment(verifyDeps({ pay_RECON001: capturedPayment("pay_RECON001", a.payment.razorpayOrderId, 200) }), {
      uid: "cust-aaaa111",
      orderId: a.payment.razorpayOrderId,
      paymentId: "pay_RECON001",
      signature: sign(a.payment.razorpayOrderId, "pay_RECON001"),
    });
    // 2: paid, then its ledger entry is missing (a difference).
    const b = await startTopup("cust-bbbb222", 300);
    await creditTopup({ repo: repo as never, now }, { topupId: b.topupId, expectUid: "cust-bbbb222", paymentId: "pay_RECON002", orderId: b.payment.razorpayOrderId, paidPaise: 30_000, currency: "INR" });
    repo.docs.delete(ledgerPath("cust-bbbb222", ledgerEntryId(`topup:${b.topupId}`)));
    // 3: held for an amount mismatch (a difference).
    const c = await startTopup("cust-cccc333", 400);
    await creditTopup({ repo: repo as never, now }, { topupId: c.topupId, expectUid: "cust-cccc333", paymentId: "pay_RECON003", orderId: c.payment.razorpayOrderId, paidPaise: 1_000, currency: "INR" });

    const report = await listTopups({ repo: repo as never }, {});
    assert.equal(report.totals.paidCount, 3, "two paid plus one held");
    assert.equal(report.totals.paidRupees, 200 + 300 + 400);
    assert.equal(report.totals.paidCoins, 200 + 300 + 400);
    assert.equal(report.totals.ledgerCreditCoins, 200);
    assert.equal(report.totals.differenceCoins, 700);
    const reasons = report.differences.map((d) => `${d.topupId}:${d.reason}`).sort();
    assert.deepEqual(reasons.sort(), [`${b.topupId}:NO_LEDGER_ENTRY`, `${c.topupId}:HELD`].sort());
    const held = report.differences.find((d) => d.reason === "HELD");
    assert.equal(held?.hold, "AMOUNT_MISMATCH");
  });

  test("a ledger entry with the wrong coins is a mismatch", async () => {
    const a = await startTopup("cust-dddd444", 200);
    await creditTopup({ repo: repo as never, now }, { topupId: a.topupId, expectUid: "cust-dddd444", paymentId: "pay_RECON004", orderId: a.payment.razorpayOrderId, paidPaise: 20_000, currency: "INR" });
    const p = ledgerPath("cust-dddd444", ledgerEntryId(`topup:${a.topupId}`));
    repo.docs.set(p, { data: { ...(repo.data(p) as object), amount: 150 } as Record<string, unknown>, version: 2 });
    const report = await listTopups({ repo: repo as never }, { uid: "cust-dddd444" });
    assert.equal(report.differences[0]?.reason, "LEDGER_MISMATCH");
    assert.equal(report.differences[0]?.ledgerCoins, 150);
  });

  test("customers are masked in the admin view, and the read model has no raw customer id", async () => {
    await startTopup("customer-uid-9876", 100);
    const report = await listTopups({ repo: repo as never }, {});
    assert.equal(report.rows[0]?.customer, "cust…76");
    assert.equal(JSON.stringify(report).includes("customer-uid-9876"), false);
  });
});

describe("Razorpay payment reads", () => {
  test("an id that is not a Razorpay payment id is not sent anywhere", async () => {
    const realFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    try {
      assert.equal(await fetchRazorpayPayment("../etc/passwd"), null);
      assert.equal(called, false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("a payment is read with the key pair server-side and returned as facts", async () => {
    const realFetch = globalThis.fetch;
    let auth = "";
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
      return new Response(JSON.stringify({ id: "pay_READ0001", order_id: "order_READ0001", amount: 50_000, currency: "INR", status: "captured" }), { status: 200 });
    }) as typeof fetch;
    try {
      const facts = await fetchRazorpayPayment("pay_READ0001");
      assert.equal(facts?.amount, 50_000);
      assert.equal(facts?.status, "captured");
      assert.equal(auth, "Basic " + Buffer.from(`${KEY_ID}:${SECRET}`).toString("base64"));
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
