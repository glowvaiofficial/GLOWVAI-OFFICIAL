import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { generateReferralCode, normaliseReferralCode } from "../../lib/shop/growth/codes";
import { applyReferralCode, getOrCreateReferralCode, grantReferralRewards, referralStatus } from "../../lib/shop/growth/referrals";
import { ledgerSum, walletPath } from "../../lib/shop/growth/ledger";
import { MemoryRepo } from "./memoryRepo";

const NOW = Date.UTC(2026, 10, 6, 6, 0);
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function seedOrder(repo: MemoryRepo, orderId: string, userId: string, status: string, fulfilment?: string) {
  repo.seed(`orders/${orderId}`, { orderId, userId, status, createdAt: NOW });
  if (fulfilment) repo.seed(`admin_orders/${orderId}`, { fulfilment });
}

// A referrer with a code, and a referee who has applied it.
async function pair(repo: MemoryRepo, referrer: string, referee: string): Promise<string> {
  const code = (await getOrCreateReferralCode(repo, referrer, NOW)) as string;
  const r = await applyReferralCode(repo, { uid: referee, code, now: NOW });
  assert.equal(r.ok, true);
  return code;
}

describe("referral codes", () => {
  test("a generated code is 8 characters from the unambiguous alphabet", () => {
    const code = generateReferralCode();
    assert.equal(code.length, 8);
    for (const ch of code) assert.ok(ALPHABET.includes(ch), `character ${ch}`);
    for (const forbidden of ["0", "O", "1", "I", "L"]) assert.ok(!code.includes(forbidden));
  });

  test("bytes that would bias the alphabet are skipped", () => {
    const feeds = [new Uint8Array(16).fill(255), new Uint8Array(16).fill(0)];
    const code = generateReferralCode(() => feeds.shift() ?? new Uint8Array(16).fill(0));
    assert.equal(code, "AAAAAAAA");
  });

  test("a typed code is cleaned up, and anything else is refused", () => {
    assert.equal(normaliseReferralCode(" abcd-2345 "), "ABCD2345");
    assert.equal(normaliseReferralCode("ABCD234I"), "");
    assert.equal(normaliseReferralCode("ABCD23"), "");
    assert.equal(normaliseReferralCode(12345678), "");
  });

  test("a customer keeps one code, and codes are unique across customers", async () => {
    const repo = new MemoryRepo();
    const first = await getOrCreateReferralCode(repo, "u1", NOW);
    assert.equal(await getOrCreateReferralCode(repo, "u1", NOW + 5), first);
    const codes = new Set<string>();
    for (let i = 0; i < 60; i++) codes.add((await getOrCreateReferralCode(repo, `user-${i}`, NOW)) as string);
    assert.equal(codes.size, 60);
  });

  test("a code already taken is not handed out again", async () => {
    const repo = new MemoryRepo();
    repo.seed("referralCodes/ABCDEFGH", { code: "ABCDEFGH", ownerUid: "someone" });
    const feeds = ["ABCDEFGH", "JKMNPQRS"];
    const code = await getOrCreateReferralCode(repo, "u2", NOW, () => feeds.shift() ?? "ZZZZZZZZ");
    assert.equal(code, "JKMNPQRS");
  });
});

describe("applying a friend's code", () => {
  test("the code must exist, be well formed and not be the customer's own", async () => {
    const repo = new MemoryRepo();
    const own = (await getOrCreateReferralCode(repo, "owner", NOW)) as string;
    const self = await applyReferralCode(repo, { uid: "owner", code: own, now: NOW });
    assert.equal(self.ok === false && self.code, "OWN_CODE");
    const malformed = await applyReferralCode(repo, { uid: "x", code: "bad", now: NOW });
    assert.equal(malformed.ok === false && malformed.code, "INVALID_CODE");
    const unknown = await applyReferralCode(repo, { uid: "x", code: "ZZZZZZZZ", now: NOW });
    assert.equal(unknown.ok === false && unknown.code, "UNKNOWN_CODE");
    assert.equal(repo.data("referrals/owner")?.appliedCode, undefined);
  });

  test("a code can be applied once per customer: a second code or the same code again is refused", async () => {
    const repo = new MemoryRepo();
    const code = await pair(repo, "owner", "friend");
    const again = await applyReferralCode(repo, { uid: "friend", code, now: NOW });
    assert.equal(again.ok === false && again.code, "ALREADY_APPLIED");
    const other = (await getOrCreateReferralCode(repo, "owner2", NOW)) as string;
    const second = await applyReferralCode(repo, { uid: "friend", code: other, now: NOW });
    assert.equal(second.ok === false && second.code, "ALREADY_APPLIED");
  });

  test("a customer who has already ordered cannot apply a code", async () => {
    const repo = new MemoryRepo();
    const code = (await getOrCreateReferralCode(repo, "owner", NOW)) as string;
    seedOrder(repo, "GV-261105-CCCCCC", "veteran", "DELIVERED");
    const r = await applyReferralCode(repo, { uid: "veteran", code, now: NOW });
    assert.equal(r.ok === false && r.code, "NOT_NEW_CUSTOMER");
    assert.equal(repo.data("referrals/veteran"), undefined);
  });

  test("the referrer and referee see a pending status until the reward is paid", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    const referee = await referralStatus(repo, "friend");
    assert.equal(referee.applied, true);
    assert.equal(referee.rewardStatus, "PENDING");
    assert.equal(referee.rewardCoins, 0);
    const referrer = await referralStatus(repo, "owner");
    assert.equal(referrer.referredCount, 1);
    assert.equal(referrer.rewardedCount, 0);
  });
});

describe("referral rewards on delivery", () => {
  test("nothing is granted before the order is delivered", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-DDDDDD", "friend", "PLACED");
    const r = await grantReferralRewards(repo, { orderId: "GV-261106-DDDDDD", actor: "Staff A", now: NOW });
    assert.deepEqual(r, { ok: true, granted: false, reason: "NOT_DELIVERED" });
    assert.equal(repo.data(walletPath("friend")), undefined);
    assert.equal(repo.data(walletPath("owner")), undefined);
  });

  test("a delivered first order grants 50 coins to each side, once", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-EEEEEE", "friend", "DELIVERED");
    const first = await grantReferralRewards(repo, { orderId: "GV-261106-EEEEEE", actor: "Staff A", now: NOW });
    assert.deepEqual(first, { ok: true, granted: true, refereeCoins: 50, referrerCoins: 50 });
    assert.equal(repo.data(walletPath("friend"))?.balance, 50);
    assert.equal(repo.data(walletPath("owner"))?.balance, 50);
    assert.equal((await referralStatus(repo, "friend")).rewardStatus, "REWARDED");
    assert.equal((await referralStatus(repo, "owner")).rewardedCount, 1);

    const repeat = await grantReferralRewards(repo, { orderId: "GV-261106-EEEEEE", actor: "Staff A", now: NOW + 1 });
    assert.deepEqual(repeat, { ok: true, granted: false, reason: "ALREADY_GRANTED" });
    assert.equal(repo.data(walletPath("friend"))?.balance, 50);
    assert.equal(repo.data(walletPath("owner"))?.balance, 50);
  });

  test("a second delivered order of the same referee grants nothing more", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-FFFFFF", "friend", "DELIVERED");
    seedOrder(repo, "GV-261106-GGGGGG", "friend", "DELIVERED");
    await grantReferralRewards(repo, { orderId: "GV-261106-FFFFFF", actor: "Staff A", now: NOW });
    const later = await grantReferralRewards(repo, { orderId: "GV-261106-GGGGGG", actor: "Staff A", now: NOW });
    assert.deepEqual(later, { ok: true, granted: false, reason: "ALREADY_REWARDED" });
    assert.equal(repo.data(walletPath("friend"))?.balance, 50);
  });

  test("concurrent grants for the same order credit each side exactly once", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-HHHHHH", "friend", "DELIVERED");
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => grantReferralRewards(repo, { orderId: "GV-261106-HHHHHH", actor: "Staff A", now: NOW })));
    assert.equal(results.filter((r) => r.ok && r.granted).length, 1);
    assert.equal(repo.data(walletPath("friend"))?.balance, 50);
    assert.equal(repo.data(walletPath("owner"))?.balance, 50);
  });

  test("the ledger reconciles with the cached balances", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-IIIIII", "friend", "DELIVERED");
    await grantReferralRewards(repo, { orderId: "GV-261106-IIIIII", actor: "Staff A", now: NOW });
    for (const uid of ["friend", "owner"]) {
      const entries = await repo.query(`wallets/${uid}/ledger`, [], { limit: 100 });
      assert.equal(ledgerSum(entries.map((e) => e.data() as { type: "CREDIT" | "DEBIT"; amount: number })), repo.data(walletPath(uid))?.balance);
    }
  });

  test("the admin's delivered status counts; a cancelled order never does", async () => {
    const repo = new MemoryRepo();
    await pair(repo, "owner", "friend");
    seedOrder(repo, "GV-261106-JJJJJJ", "friend", "PLACED", "CANCELLED");
    const cancelled = await grantReferralRewards(repo, { orderId: "GV-261106-JJJJJJ", actor: "Staff A", now: NOW });
    assert.deepEqual(cancelled, { ok: true, granted: false, reason: "NOT_DELIVERED" });
    seedOrder(repo, "GV-261106-KKKKKK", "friend", "PLACED", "DELIVERED");
    const delivered = await grantReferralRewards(repo, { orderId: "GV-261106-KKKKKK", actor: "Staff A", now: NOW });
    assert.equal(delivered.ok && delivered.granted, true);
  });

  test("an order from a customer with no referral, or an unknown order, grants nothing", async () => {
    const repo = new MemoryRepo();
    seedOrder(repo, "GV-261106-LLLLLL", "stranger", "DELIVERED");
    assert.deepEqual(await grantReferralRewards(repo, { orderId: "GV-261106-LLLLLL", actor: "Staff A", now: NOW }), { ok: true, granted: false, reason: "NO_REFERRAL" });
    assert.deepEqual(await grantReferralRewards(repo, { orderId: "GV-261106-MMMMMM", actor: "Staff A", now: NOW }), { ok: false, code: "ORDER_NOT_FOUND" });
  });

  test("the actor must be named for the audit trail", async () => {
    const repo = new MemoryRepo();
    assert.deepEqual(await grantReferralRewards(repo, { orderId: "GV-261106-NNNNNN", actor: " ", now: NOW }), { ok: false, code: "BAD_ACTOR" });
  });
});
