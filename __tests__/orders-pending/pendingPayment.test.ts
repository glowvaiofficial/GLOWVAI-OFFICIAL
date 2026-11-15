import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  IDEMPOTENCY_WINDOW_MS,
  PENDING_PAYMENT_WINDOW_MS,
  bagFingerprint,
  coinsReleasePlan,
  coinsRetakePlan,
  coinsShortNote,
  decidePendingOrder,
  idempotencyDocId,
  idempotentOrderId,
  isPendingExpired,
  isUnpaidPending,
  parseIdempotencyKey,
  releaseCoinsTx,
  retakeCoinsTx,
  type BagFingerprintInput,
  type PendingOrderLike,
} from "../../lib/shop/pendingPayment";
import { adjustCoins, applyCoins } from "../../lib/shop/growth/coins";
import { walletPath } from "../../lib/shop/growth/ledger";
import { MemoryRepo } from "../growth/memoryRepo";

const T0 = 1_800_000_000_000;
const MIN = 60_000;

const pending = (over: Partial<PendingOrderLike> = {}): PendingOrderLike => ({
  status: "PAYMENT_PENDING",
  userId: "u1",
  createdAt: T0,
  payment: { method: "ONLINE", status: "PENDING" },
  pricing: { coinsRedeemed: 0, grandTotal: 500 },
  bagKey: "bag-a",
  razorpayOrderId: "order_rzp1",
  ...over,
});

describe("unpaid order expiry", () => {
  test("an unpaid order inside the window is kept", () => {
    assert.equal(isPendingExpired(pending(), T0 + 29 * MIN), false);
  });
  test("an unpaid order expires once the window has passed", () => {
    assert.equal(PENDING_PAYMENT_WINDOW_MS, 30 * MIN);
    assert.equal(isPendingExpired(pending(), T0 + 30 * MIN), true);
    assert.equal(isPendingExpired(pending({ payment: { method: "ONLINE", status: "FAILED" } }), T0 + 31 * MIN), true);
  });
  test("a retry restarts the window", () => {
    assert.equal(isPendingExpired(pending({ paymentAttemptAt: T0 + 20 * MIN }), T0 + 40 * MIN), false);
    assert.equal(isPendingExpired(pending({ paymentAttemptAt: T0 + 20 * MIN }), T0 + 50 * MIN), true);
  });
  test("paid, placed and cancelled orders never expire", () => {
    assert.equal(isPendingExpired(pending({ payment: { method: "ONLINE", status: "PAID" } }), T0 + 999 * MIN), false);
    assert.equal(isPendingExpired(pending({ status: "PLACED" }), T0 + 999 * MIN), false);
    assert.equal(isPendingExpired(pending({ status: "CANCELLED" }), T0 + 999 * MIN), false);
  });
  test("an unpaid order with no readable time is treated as expired", () => {
    assert.equal(isPendingExpired(pending({ createdAt: undefined }), T0), true);
  });
  test("a Firestore Timestamp createdAt is read", () => {
    assert.equal(isPendingExpired(pending({ createdAt: { toMillis: () => T0 } }), T0 + 5 * MIN), false);
  });
  test("isUnpaidPending only for PAYMENT_PENDING without a settled payment", () => {
    assert.equal(isUnpaidPending(pending()), true);
    assert.equal(isUnpaidPending(pending({ payment: { status: "REFUNDED" } })), false);
  });
});

describe("retry of the same bag", () => {
  const next = { uid: "u1", bagKey: "bag-a", grandTotal: 500, online: true, now: T0 + 5 * MIN };
  test("same bag, same total, inside the window: reuse", () => {
    assert.equal(decidePendingOrder(pending(), next), "REUSE");
    assert.equal(decidePendingOrder(pending({ payment: { method: "ONLINE", status: "FAILED" } }), next), "REUSE");
  });
  test("a different bag or total: the old order is replaced", () => {
    assert.equal(decidePendingOrder(pending(), { ...next, bagKey: "bag-b" }), "SUPERSEDE");
    assert.equal(decidePendingOrder(pending(), { ...next, grandTotal: 501 }), "SUPERSEDE");
    assert.equal(decidePendingOrder(pending(), { ...next, online: false }), "SUPERSEDE");
    assert.equal(decidePendingOrder(pending({ bagKey: undefined }), next), "SUPERSEDE");
    assert.equal(decidePendingOrder(pending({ razorpayOrderId: null }), next), "SUPERSEDE");
  });
  test("past the window: expire, even for the same bag", () => {
    assert.equal(decidePendingOrder(pending(), { ...next, now: T0 + 31 * MIN }), "EXPIRE");
  });
  test("another customer's order, or one already paid, is never touched", () => {
    assert.equal(decidePendingOrder(pending({ userId: "u2" }), next), "SKIP");
    assert.equal(decidePendingOrder(pending({ payment: { method: "ONLINE", status: "PAID" } }), next), "SKIP");
    assert.equal(decidePendingOrder(pending({ status: "PLACED" }), next), "SKIP");
  });
});

describe("bag fingerprint", () => {
  const base: BagFingerprintInput = {
    paymentMethod: "ONLINE",
    lines: [
      { productId: "p1", variantId: null, quantity: 1 },
      { productId: "p2", variantId: "v30", quantity: 2 },
    ],
    addressId: "adr_0123456789abcdef",
    address: null,
    deliverySlotId: "slot-1",
    couponCode: "glow10",
    tip: 0,
    coinsRequested: 20,
  };
  test("the order of the lines and the case of the code do not matter", () => {
    const shuffled = { ...base, lines: [...base.lines].reverse(), couponCode: " GLOW10 " };
    assert.equal(bagFingerprint(shuffled), bagFingerprint(base));
  });
  test("split lines for the same item count as one", () => {
    const split = { ...base, lines: [{ productId: "p1", quantity: 1 }, { productId: "p2", variantId: "v30", quantity: 1 }, { productId: "p2", variantId: "v30", quantity: 1 }] };
    assert.equal(bagFingerprint(split), bagFingerprint(base));
  });
  test("anything that changes the order or its price changes the fingerprint", () => {
    const fp = bagFingerprint(base);
    assert.notEqual(bagFingerprint({ ...base, coinsRequested: 10 }), fp);
    assert.notEqual(bagFingerprint({ ...base, tip: 20 }), fp);
    assert.notEqual(bagFingerprint({ ...base, paymentMethod: "COD" }), fp);
    assert.notEqual(bagFingerprint({ ...base, deliverySlotId: "slot-2" }), fp);
    assert.notEqual(bagFingerprint({ ...base, lines: [{ productId: "p1", quantity: 2 }, base.lines[1]] }), fp);
    assert.notEqual(bagFingerprint({ ...base, addressId: null, address: { pincode: "560001", fullAddress: "1 MG Road" } }), fp);
  });
});

describe("Idempotency-Key", () => {
  test("usable keys are 8 to 200 visible characters; others are ignored", () => {
    assert.equal(parseIdempotencyKey("3f2a9c1e-77b0-4d1c-9a51-2b2c0f6e7a10"), "3f2a9c1e-77b0-4d1c-9a51-2b2c0f6e7a10");
    assert.equal(parseIdempotencyKey("  order-key-123  "), "order-key-123");
    assert.equal(parseIdempotencyKey("short"), null);
    assert.equal(parseIdempotencyKey("has space inside"), null);
    assert.equal(parseIdempotencyKey("x".repeat(201)), null);
    assert.equal(parseIdempotencyKey(null), null);
  });
  test("the record id is per customer", () => {
    assert.equal(idempotencyDocId("u1", "key-12345"), idempotencyDocId("u1", "key-12345"));
    assert.notEqual(idempotencyDocId("u1", "key-12345"), idempotencyDocId("u2", "key-12345"));
  });
  test("a stored key returns its order for the same customer within 24 hours only", () => {
    const rec = { uid: "u1", orderId: "GV-1", createdAt: T0 };
    assert.equal(idempotentOrderId(rec, "u1", T0 + 60 * MIN), "GV-1");
    assert.equal(idempotentOrderId(rec, "u2", T0 + 60 * MIN), null);
    assert.equal(idempotentOrderId(rec, "u1", T0 + IDEMPOTENCY_WINDOW_MS), null);
    assert.equal(idempotentOrderId(undefined, "u1", T0), null);
    assert.equal(idempotentOrderId({ uid: "u1", orderId: "", createdAt: T0 }, "u1", T0), null);
  });
});

describe("coin release and retake plans", () => {
  test("no coins, nothing to do", () => {
    assert.equal(coinsReleasePlan(pending(), "GV-1"), null);
    assert.equal(coinsRetakePlan(pending(), "GV-1"), null);
  });
  test("the first release keeps the cancel route's key; later cycles get their own", () => {
    const o = pending({ pricing: { coinsRedeemed: 40 } });
    assert.deepEqual(coinsReleasePlan(o, "GV-1"), { amount: 40, key: "cancel:GV-1", nextCount: 1 });
    assert.equal(coinsRetakePlan(o, "GV-1"), null);
    const released = { ...o, coinsReleasedAt: T0, coinsReleaseCount: 1 };
    assert.equal(coinsReleasePlan(released, "GV-1"), null);
    assert.deepEqual(coinsRetakePlan(released, "GV-1"), { amount: 40, key: "retake:GV-1:1" });
    const retaken = { ...released, coinsReleasedAt: null };
    assert.deepEqual(coinsReleasePlan(retaken, "GV-1"), { amount: 40, key: "cancel:GV-1:1", nextCount: 2 });
  });
  test("the short note is only written when coins were short", () => {
    assert.equal(coinsShortNote(0), null);
    assert.match(String(coinsShortNote(5)), /5 coins/);
  });
});

// The coin steps against the in-memory store (same transaction rules as Firestore).
describe("coin release and retake in a transaction", () => {
  const ORDER = "GV-261115-ABC123";
  async function setup(balance: number, coins: number) {
    const repo = new MemoryRepo();
    await adjustCoins(repo, { uid: "u1", amount: balance, reason: "Seed balance for the test", actor: "test team", idempotencyKey: "seed", now: 1 });
    await repo.runTx(async (tx) => {
      const applied = await applyCoins(tx, repo.ref, { uid: "u1", requested: coins, itemTotal: 10_000, orderId: ORDER, now: 2 });
      assert.equal(applied.ok, true);
      if (applied.ok) applied.commit();
    });
    return repo;
  }
  const balanceOf = (repo: MemoryRepo) => Number(repo.data(walletPath("u1"))?.balance ?? 0);
  const release = (repo: MemoryRepo, order: PendingOrderLike) =>
    repo.runTx(async (tx) => {
      const r = await releaseCoinsTx(tx, repo.ref, order, { uid: "u1", orderId: ORDER, reason: "Coins returned", actor: "system", now: 3 });
      r.commit();
      return r;
    });
  const retake = (repo: MemoryRepo, order: PendingOrderLike, strict: boolean) =>
    repo.runTx(async (tx) => {
      const r = await retakeCoinsTx(tx, repo.ref, order, { uid: "u1", orderId: ORDER, now: 4, strict });
      if (r.ok) r.commit();
      return r;
    });

  test("a release credits the coins once, even when it runs twice on the same order state", async () => {
    const repo = await setup(100, 40);
    assert.equal(balanceOf(repo), 60);
    const order = pending({ pricing: { coinsRedeemed: 40 } });
    const first = await release(repo, order);
    assert.deepEqual(first.patch, { coinsReleasedAt: 3, coinsReleaseCount: 1 });
    assert.equal(first.credited, 40);
    // A second run that read the order before the first committed (same state): the ledger key stops a second credit.
    const second = await release(repo, order);
    assert.equal(second.credited, 0);
    assert.equal(balanceOf(repo), 100);
    // A run that sees the order after the first committed has nothing to do.
    const third = await release(repo, { ...order, ...first.patch });
    assert.deepEqual(third.patch, {});
    assert.equal(balanceOf(repo), 100);
  });

  test("payment after a release takes the coins again, once; a second failure gives them back again", async () => {
    const repo = await setup(100, 40);
    let order: PendingOrderLike = pending({ pricing: { coinsRedeemed: 40 } });
    order = { ...order, ...(await release(repo, order)).patch };
    assert.equal(balanceOf(repo), 100);
    const taken = await retake(repo, order, true);
    assert.equal(taken.ok, true);
    if (!taken.ok) return;
    assert.equal(taken.taken, 40);
    assert.equal(balanceOf(repo), 60);
    // The same retake again (stale order state): no second debit.
    await retake(repo, order, true);
    assert.equal(balanceOf(repo), 60);
    order = { ...order, ...taken.patch };
    // Another failure in a new cycle credits again under its own key.
    order = { ...order, ...(await release(repo, order)).patch };
    assert.equal(balanceOf(repo), 100);
    assert.equal(order.coinsReleaseCount, 2);
  });

  test("a strict retake is refused when the coins were spent meanwhile; nothing is written", async () => {
    const repo = await setup(100, 40);
    let order: PendingOrderLike = pending({ pricing: { coinsRedeemed: 40 } });
    order = { ...order, ...(await release(repo, order)).patch };
    await adjustCoins(repo, { uid: "u1", amount: -90, reason: "Spent elsewhere in the test", actor: "test team", idempotencyKey: "spend", now: 5 });
    assert.equal(balanceOf(repo), 10);
    const r = await retake(repo, order, true);
    assert.deepEqual(r, { ok: false, short: 30 });
    assert.equal(balanceOf(repo), 10);
  });

  test("a late payment takes what is there and reports the rest", async () => {
    const repo = await setup(100, 40);
    let order: PendingOrderLike = pending({ pricing: { coinsRedeemed: 40 } });
    order = { ...order, ...(await release(repo, order)).patch };
    await adjustCoins(repo, { uid: "u1", amount: -90, reason: "Spent elsewhere in the test", actor: "test team", idempotencyKey: "spend", now: 5 });
    const r = await retake(repo, order, false);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.taken, 10);
    assert.equal(r.short, 30);
    assert.deepEqual(r.patch, { coinsReleasedAt: null, coinsShort: 30 });
    assert.equal(balanceOf(repo), 0);
  });
});
