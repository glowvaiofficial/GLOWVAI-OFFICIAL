import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { balanceAfter, ledgerEntryId, ledgerPath, ledgerSum, planLedgerEntry, walletPath, writeLedgerPlan, type LedgerInput } from "../../lib/shop/growth/ledger";
import { MemoryRepo } from "./memoryRepo";

const credit = (amount: number, key: string): LedgerInput => ({
  type: "CREDIT",
  source: "REFERRAL_REFEREE",
  amount,
  idempotencyKey: key,
  reason: "Test credit",
  orderId: null,
  actor: "system",
});
const debit = (amount: number, key: string): LedgerInput => ({
  type: "DEBIT",
  source: "CHECKOUT_REDEMPTION",
  amount,
  idempotencyKey: key,
  reason: "Test debit",
  orderId: null,
  actor: "customer",
});

// One ledger write in its own transaction, the way the modules use it.
async function post(repo: MemoryRepo, uid: string, input: LedgerInput, now = 1_000) {
  return repo.runTx(async (tx) => {
    const planned = await planLedgerEntry(tx, repo.ref, uid, input);
    if (planned.ok) writeLedgerPlan(tx, planned.plan, now);
    return planned;
  });
}

async function entriesOf(repo: MemoryRepo, uid: string) {
  const snaps = await repo.query(`wallets/${uid}/ledger`, [], { limit: 500 });
  return snaps.map((s) => s.data() as { type: "CREDIT" | "DEBIT" | "EXPIRY"; amount: number; balanceAfter: number });
}

describe("ledger rules", () => {
  test("credits add and debits subtract", () => {
    assert.deepEqual(balanceAfter(10, credit(5, "a")), { ok: true, balance: 15 });
    assert.deepEqual(balanceAfter(10, debit(4, "b")), { ok: true, balance: 6 });
  });

  test("a debit larger than the balance is refused, so a balance never goes negative", () => {
    assert.deepEqual(balanceAfter(3, debit(4, "c")), { ok: false, refusal: "NEGATIVE_BALANCE" });
  });

  test("a debit that uses the whole balance is allowed and leaves zero", () => {
    assert.deepEqual(balanceAfter(4, debit(4, "d")), { ok: true, balance: 0 });
  });

  test("amounts must be positive whole coins", () => {
    for (const amount of [0, -5, 1.5, Number.NaN, 2_000_000]) {
      assert.deepEqual(balanceAfter(100, credit(amount, "e")), { ok: false, refusal: "INVALID_AMOUNT" }, `amount ${amount}`);
    }
  });

  test("a manual adjustment must say why", () => {
    const adjust = (reason: string): LedgerInput => ({ ...credit(10, "f"), source: "ADMIN_ADJUSTMENT", reason });
    assert.deepEqual(balanceAfter(0, adjust("ok")), { ok: false, refusal: "INVALID_REASON" });
    assert.deepEqual(balanceAfter(0, adjust("Goodwill for a late delivery")), { ok: true, balance: 10 });
  });

  test("the entry id is derived from the idempotency key", () => {
    assert.equal(ledgerEntryId("referral-referee:u1"), ledgerEntryId("referral-referee:u1"));
    assert.notEqual(ledgerEntryId("referral-referee:u1"), ledgerEntryId("referral-referee:u2"));
    assert.equal(ledgerEntryId("x").length, 40);
  });
});

describe("wallet and ledger inside a transaction", () => {
  test("a credit writes one entry and the cached balance together", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(50, "k1"));
    const id = ledgerEntryId("k1");
    assert.equal(repo.data(ledgerPath("u1", id))?.balanceAfter, 50);
    assert.equal(repo.data(walletPath("u1"))?.balance, 50);
  });

  test("a repeated credit with the same key is applied once (idempotent)", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(50, "k1"));
    const again = await post(repo, "u1", credit(50, "k1"));
    assert.equal(again.ok && again.plan.duplicate, true);
    assert.equal(repo.data(walletPath("u1"))?.balance, 50);
    assert.equal((await entriesOf(repo, "u1")).length, 1);
  });

  test("a refused debit writes nothing", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(10, "k1"));
    const before = repo.log.length;
    const refused = await post(repo, "u1", debit(20, "k2"));
    assert.deepEqual(refused, { ok: false, refusal: "NEGATIVE_BALANCE" });
    assert.equal(repo.log.length, before);
    assert.equal(repo.data(walletPath("u1"))?.balance, 10);
  });

  test("ledger entries cannot be overwritten: a second create on the same entry is refused by storage", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(50, "k1"));
    const id = ledgerEntryId("k1");
    await assert.rejects(
      repo.runTx(async (tx) => {
        tx.create(repo.ref(ledgerPath("u1", id)), { amount: 999 });
      }),
      /ALREADY_EXISTS/,
    );
    assert.equal(repo.data(ledgerPath("u1", id))?.amount, 50);
  });

  test("the cached balance equals the sum of the ledger after a mixed history", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(50, "a"));
    await post(repo, "u1", credit(50, "b"));
    await post(repo, "u1", debit(30, "c"));
    await post(repo, "u1", credit(10, "d"));
    const entries = await entriesOf(repo, "u1");
    assert.equal(repo.data(walletPath("u1"))?.balance, 80);
    assert.equal(ledgerSum(entries), 80);
  });

  test("concurrent debits never overdraw: exactly the affordable ones succeed", async () => {
    const repo = new MemoryRepo();
    await post(repo, "u1", credit(100, "seed"));
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => post(repo, "u1", debit(30, `race-${i}`))));
    assert.equal(results.filter((r) => r.ok).length, 3);
    assert.equal(repo.data(walletPath("u1"))?.balance, 10);
    assert.equal(ledgerSum(await entriesOf(repo, "u1")), 10);
  });

  test("reads must come before writes inside a transaction", async () => {
    const repo = new MemoryRepo();
    await assert.rejects(
      repo.runTx(async (tx) => {
        tx.set(repo.ref("wallets/u9"), { balance: 1 });
        await tx.get(repo.ref("wallets/u9"));
      }),
      /reads/,
    );
  });
});
