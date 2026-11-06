import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { adjustCoins, applyCoins, coinsToRupees, maxRedeemable, parseCoinsRequested } from "../../lib/shop/growth/coins";
import { ledgerSum, walletPath } from "../../lib/shop/growth/ledger";
import { MemoryRepo } from "./memoryRepo";

async function seedBalance(repo: MemoryRepo, uid: string, coins: number) {
  await adjustCoins(repo, { uid, amount: coins, reason: "Seed balance for the test", actor: "test team", idempotencyKey: `seed-${uid}-${coins}`, now: 1 });
}

describe("coin cap maths", () => {
  test("at most 20 per cent of the item total, rounded down", () => {
    assert.equal(maxRedeemable({ itemTotal: 1000, balance: 10_000 }), 200);
    assert.equal(maxRedeemable({ itemTotal: 999, balance: 10_000 }), 199);
    assert.equal(maxRedeemable({ itemTotal: 4, balance: 10_000 }), 0);
  });

  test("never more than the balance", () => {
    assert.equal(maxRedeemable({ itemTotal: 1000, balance: 50 }), 50);
    assert.equal(maxRedeemable({ itemTotal: 1000, balance: 0 }), 0);
  });

  test("bad inputs give zero, never a negative or fractional cap", () => {
    assert.equal(maxRedeemable({ itemTotal: -500, balance: 100 }), 0);
    assert.equal(maxRedeemable({ itemTotal: Number.NaN, balance: 100 }), 0);
    assert.equal(maxRedeemable({ itemTotal: 1000, balance: -20 }), 0);
    assert.equal(maxRedeemable({ itemTotal: 1000.9, balance: 300.7 }), 200);
  });

  test("one coin is one rupee", () => {
    assert.equal(coinsToRupees(37), 37);
    assert.equal(coinsToRupees(-3), 0);
  });

  test("the requested coins are a whole number, blank means none", () => {
    assert.deepEqual(parseCoinsRequested(undefined), { ok: true, value: 0 });
    assert.deepEqual(parseCoinsRequested(""), { ok: true, value: 0 });
    assert.deepEqual(parseCoinsRequested("12"), { ok: true, value: 12 });
    assert.deepEqual(parseCoinsRequested(7), { ok: true, value: 7 });
    for (const bad of [-1, 1.5, "abc", 2_000_000_000, "1e3", {}]) {
      assert.equal(parseCoinsRequested(bad).ok, false, `value ${String(bad)}`);
    }
  });
});

describe("applyCoins at checkout (inside the order transaction)", () => {
  const order = (repo: MemoryRepo, requested: number, itemTotal: number, orderId = "GV-261106-AAAAAA") =>
    repo.runTx(async (tx) => {
      const applied = await applyCoins(tx, repo.ref, { uid: "u1", requested, itemTotal, orderId, now: 5 });
      if (applied.ok) applied.commit();
      return applied;
    });

  test("zero coins touches nothing", async () => {
    const repo = new MemoryRepo();
    const r = await order(repo, 0, 1000);
    assert.equal(r.ok && r.redeemed, 0);
    assert.equal(repo.log.length, 0);
  });

  test("more than the cap is refused and nothing is written", async () => {
    const repo = new MemoryRepo();
    await seedBalance(repo, "u1", 500);
    const before = repo.log.length;
    const r = await order(repo, 201, 1000);
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.code, "COINS_OVER_CAP");
    assert.equal(repo.log.length, before);
    assert.equal(repo.data(walletPath("u1"))?.balance, 500);
  });

  test("within the cap the coins are debited with a ledger entry", async () => {
    const repo = new MemoryRepo();
    await seedBalance(repo, "u1", 500);
    const r = await order(repo, 150, 1000);
    assert.equal(r.ok && r.redeemed, 150);
    assert.equal(repo.data(walletPath("u1"))?.balance, 350);
  });

  test("more than the balance is refused even when under the cap", async () => {
    const repo = new MemoryRepo();
    await seedBalance(repo, "u1", 40);
    const r = await order(repo, 60, 1000);
    assert.equal(r.ok === false && r.code, "COINS_NOT_ENOUGH");
    assert.equal(repo.data(walletPath("u1"))?.balance, 40);
  });

  test("the same order cannot redeem twice (idempotent on the order id)", async () => {
    const repo = new MemoryRepo();
    await seedBalance(repo, "u1", 500);
    await order(repo, 100, 1000, "GV-261106-BBBBBB");
    await order(repo, 100, 1000, "GV-261106-BBBBBB");
    assert.equal(repo.data(walletPath("u1"))?.balance, 400);
  });
});

describe("manual adjustments by the team", () => {
  test("a credit and a debit are recorded with the reason", async () => {
    const repo = new MemoryRepo();
    const credit = await adjustCoins(repo, { uid: "u1", amount: 25, reason: "Goodwill for a damaged item", actor: "Priya S", idempotencyKey: "t-1", now: 1 });
    assert.deepEqual(credit, { ok: true, applied: true, balance: 25 });
    const debit = await adjustCoins(repo, { uid: "u1", amount: -10, reason: "Reversal of a duplicate credit", actor: "Priya S", idempotencyKey: "t-2", now: 2 });
    assert.deepEqual(debit, { ok: true, applied: true, balance: 15 });
  });

  test("a repeated request with the same key is applied once", async () => {
    const repo = new MemoryRepo();
    await adjustCoins(repo, { uid: "u1", amount: 25, reason: "Goodwill for a damaged item", actor: "Priya S", idempotencyKey: "same", now: 1 });
    const again = await adjustCoins(repo, { uid: "u1", amount: 25, reason: "Goodwill for a damaged item", actor: "Priya S", idempotencyKey: "same", now: 2 });
    assert.deepEqual(again, { ok: true, applied: false, balance: 25 });
    assert.equal(repo.data(walletPath("u1"))?.balance, 25);
  });

  test("a debit below zero is refused", async () => {
    const repo = new MemoryRepo();
    await seedBalance(repo, "u1", 5);
    const r = await adjustCoins(repo, { uid: "u1", amount: -6, reason: "Taking back too many", actor: "Priya S", idempotencyKey: "neg", now: 1 });
    assert.deepEqual(r, { ok: false, code: "NEGATIVE_BALANCE" });
    assert.equal(repo.data(walletPath("u1"))?.balance, 5);
  });

  test("a reason is required, and a zero or fractional amount is refused", async () => {
    const repo = new MemoryRepo();
    assert.deepEqual(await adjustCoins(repo, { uid: "u1", amount: 5, reason: "ok", actor: "Priya S", idempotencyKey: "r1", now: 1 }), { ok: false, code: "INVALID_REASON" });
    assert.deepEqual(await adjustCoins(repo, { uid: "u1", amount: 0, reason: "No change at all", actor: "Priya S", idempotencyKey: "r2", now: 1 }), { ok: false, code: "INVALID_AMOUNT" });
    assert.deepEqual(await adjustCoins(repo, { uid: "u1", amount: 2.5, reason: "Half a coin", actor: "Priya S", idempotencyKey: "r3", now: 1 }), { ok: false, code: "INVALID_AMOUNT" });
  });

  test("the balance matches the ledger after several adjustments", async () => {
    const repo = new MemoryRepo();
    await adjustCoins(repo, { uid: "u1", amount: 100, reason: "Welcome gift for the team", actor: "Priya S", idempotencyKey: "m1", now: 1 });
    await adjustCoins(repo, { uid: "u1", amount: -30, reason: "Reversal of a wrong credit", actor: "Priya S", idempotencyKey: "m2", now: 2 });
    const entries = await repo.query("wallets/u1/ledger", [], { limit: 50 });
    assert.equal(ledgerSum(entries.map((e) => e.data() as { type: "CREDIT" | "DEBIT"; amount: number })), 70);
    assert.equal(repo.data(walletPath("u1"))?.balance, 70);
  });
});
