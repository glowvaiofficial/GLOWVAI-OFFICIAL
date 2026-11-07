import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  GIFT_ALPHABET,
  GIFT_MAX_RUPEES,
  GIFT_MIN_RUPEES,
  PURCHASE_MAX_PER_DAY,
  REDEEM_MAX_ATTEMPTS,
  REDEEM_WINDOW_MS,
  cardIdFor,
  codeMatches,
  coinsForCard,
  formatGiftCode,
  generateGiftCode,
  hashGiftCode,
  lastFourOf,
  newCodeSalt,
  normalizeGiftCode,
  validateGiftAmount,
  validateGiftDetails,
} from "../../lib/shop/giftCards/rules";
import { creditGiftCard, issueGiftCard, purchasePath } from "../../lib/shop/giftCards/service";
import { countAttempt, dayKey } from "../../lib/shop/privacy/rules";
import { MemoryRepo } from "../growth/memoryRepo";

const CODE = "ABCD2345EFGHJKMN";
const DAY = 24 * 60 * 60 * 1000;

function purchaseFixture(repo: MemoryRepo, overrides: Record<string, unknown> = {}) {
  repo.seed(purchasePath("gcp_1"), {
    uid: "u_buyer",
    status: "PENDING_PAYMENT",
    amountRupees: 500,
    recipientName: "Asha Rao",
    message: "Happy Diwali",
    razorpayOrderId: "order_Gift0001",
    ...overrides,
  });
}

describe("gift card amounts", () => {
  test("whole rupees from 200 to 10,000 are accepted", () => {
    assert.equal(GIFT_MIN_RUPEES, 200);
    assert.equal(GIFT_MAX_RUPEES, 10_000);
    for (const v of [200, 500, 10_000, "750", " 1500 "]) {
      assert.equal(validateGiftAmount(v).ok, true, `${String(v)} should be accepted`);
    }
    assert.deepEqual(validateGiftAmount(500), { ok: true, rupees: 500 });
  });

  test("amounts outside the bounds are refused", () => {
    for (const v of [199, 0, -200, 10_001, 99_999, 1_000_000]) {
      assert.equal(validateGiftAmount(v).ok, false, `${v} should be refused`);
    }
  });

  test("decimals, exponents, signs and non-numbers are refused", () => {
    for (const v of [500.5, "500.5", "1e3", "+500", "-500", "", null, undefined, NaN, Infinity, "abc", true, [500]]) {
      assert.equal(validateGiftAmount(v).ok, false, `${JSON.stringify(v)} should be refused`);
    }
  });

  test("a card is worth whole coins at the current rate (one rupee per coin)", () => {
    assert.equal(coinsForCard(500), 500);
  });
});

describe("gift card recipient and message", () => {
  test("a recipient name and a short plain message are accepted and trimmed", () => {
    assert.deepEqual(validateGiftDetails({ recipientName: "  Asha   Rao ", message: " Happy Diwali " }), {
      ok: true,
      recipientName: "Asha Rao",
      message: "Happy Diwali",
    });
  });

  test("the name needs two to sixty letters", () => {
    assert.equal(validateGiftDetails({ recipientName: "A", message: "" }).ok, false);
    assert.equal(validateGiftDetails({ recipientName: "x".repeat(61), message: "" }).ok, false);
    assert.equal(validateGiftDetails({ recipientName: "<b>Asha</b>", message: "" }).ok, false);
    assert.equal(validateGiftDetails({ recipientName: "Asha123", message: "" }).ok, false);
  });

  test("the message is plain text, up to 200 characters", () => {
    assert.equal(validateGiftDetails({ recipientName: "Asha", message: "x".repeat(200) }).ok, true);
    assert.equal(validateGiftDetails({ recipientName: "Asha", message: "x".repeat(201) }).ok, false);
    assert.equal(validateGiftDetails({ recipientName: "Asha", message: "<img src=x onerror=alert(1)>" }).ok, false);
    assert.equal(validateGiftDetails({ recipientName: "Asha", message: "bad\u0007bell" }).ok, false);
  });
});

describe("gift card code", () => {
  test("is 16 characters from the 31-symbol alphabet with no look-alikes", () => {
    assert.equal(GIFT_ALPHABET.length, 31);
    for (const ch of ["0", "O", "1", "I", "L"]) assert.ok(!GIFT_ALPHABET.includes(ch), `${ch} must not be in the alphabet`);
    const pattern = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{16}$/;
    for (let i = 0; i < 2000; i++) {
      const code = generateGiftCode();
      assert.match(code, pattern);
    }
  });

  test("a byte source that cycles through every value still yields valid codes", () => {
    let n = 0;
    const code = generateGiftCode((len) => Uint8Array.from({ length: len }, () => n++ % 256));
    assert.equal(code.length, 16);
    assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{16}$/);
  });

  test("typed input is normalised: spaces, dashes and lower case are accepted", () => {
    assert.equal(normalizeGiftCode("abcd-2345 efgh-jkmn-pqr"), "");
    assert.equal(normalizeGiftCode("abcd-2345-efgh-jkmn"), CODE);
    assert.equal(normalizeGiftCode(" abcd 2345 efgh jkmn "), "ABCD2345EFGHJKMN");
  });

  test("look-alike characters and wrong lengths are not codes", () => {
    assert.equal(normalizeGiftCode("ABCD0345EFGHJKMN"), "");
    assert.equal(normalizeGiftCode("ABCD1345EFGHJKMN"), "");
    assert.equal(normalizeGiftCode("ABCD2345EFGHJKM"), "");
    assert.equal(normalizeGiftCode("ABCD2345EFGHJKMNP"), "");
    assert.equal(normalizeGiftCode(undefined), "");
    assert.equal(normalizeGiftCode(12345), "");
  });

  test("displays in groups of four and keeps the last four for the account", () => {
    assert.equal(formatGiftCode(CODE), "ABCD-2345-EFGH-JKMN");
    assert.equal(lastFourOf(CODE), "JKMN");
  });

  test("the card id is a stable hash of the code and reveals no part of it", () => {
    const id = cardIdFor(CODE);
    assert.match(id, /^gc_[a-f0-9]{32}$/);
    assert.equal(id, cardIdFor(CODE));
    assert.notEqual(id, cardIdFor("ABCD2345EFGHJKMM"));
    assert.ok(!id.includes("ABCD"));
  });

  test("the code is stored only as a salted hash, with a fresh salt each time", () => {
    const saltA = newCodeSalt();
    const saltB = newCodeSalt();
    assert.match(saltA, /^[a-f0-9]{32}$/);
    assert.notEqual(saltA, saltB);
    const hash = hashGiftCode(CODE, saltA);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.ok(!hash.includes(CODE));
    assert.notEqual(hash, hashGiftCode(CODE, saltB), "the same code under another salt gives another hash");
  });

  test("a typed code matches its stored hash only when it is exactly right", () => {
    const salt = newCodeSalt();
    const stored = hashGiftCode(CODE, salt);
    assert.equal(codeMatches(CODE, salt, stored), true);
    assert.equal(codeMatches("ABCD2345EFGHJKMM", salt, stored), false);
    assert.equal(codeMatches(CODE, newCodeSalt(), stored), false, "wrong salt");
    assert.equal(codeMatches(CODE, salt, "not-hex"), false, "malformed stored hash");
    assert.equal(codeMatches(CODE, "zz", stored), false, "malformed salt");
  });
});

describe("issuing a card for a verified purchase", () => {
  test("creates one active card worth the amount in coins, and stores no code", async () => {
    const repo = new MemoryRepo();
    purchaseFixture(repo);
    const out = await issueGiftCard(repo, { purchaseId: "gcp_1", uid: "u_buyer", razorpayOrderId: "order_Gift0001", paymentId: "pay_Gift0001", code: CODE, now: 1_000 });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.alreadyIssued, false);
    const card = repo.data(`giftCards/${out.cardId}`);
    assert.ok(card);
    assert.equal(card.status, "ACTIVE");
    assert.equal(card.coins, 500);
    assert.equal(card.lastFour, "JKMN");
    assert.ok(!JSON.stringify(card).includes(CODE), "the full code is not stored");
    assert.equal(repo.data(purchasePath("gcp_1"))?.status, "ISSUED");
  });

  test("a repeat for an issued purchase makes no second card", async () => {
    const repo = new MemoryRepo();
    purchaseFixture(repo);
    const input = { purchaseId: "gcp_1", uid: "u_buyer", razorpayOrderId: "order_Gift0001", paymentId: "pay_Gift0001", code: CODE, now: 1_000 };
    const first = await issueGiftCard(repo, input);
    const before = repo.log.length;
    const second = await issueGiftCard(repo, { ...input, code: "ZZZZ2345EFGHJKMN" });
    assert.equal(repo.log.length, before, "nothing written on the repeat");
    assert.ok(first.ok && second.ok);
    if (first.ok && second.ok) {
      assert.equal(second.alreadyIssued, true);
      assert.equal(second.cardId, first.cardId);
    }
  });

  test("another customer's purchase, or a different Razorpay order, is refused", async () => {
    const repo = new MemoryRepo();
    purchaseFixture(repo);
    const other = await issueGiftCard(repo, { purchaseId: "gcp_1", uid: "u_other", razorpayOrderId: "order_Gift0001", paymentId: "p", code: CODE, now: 1 });
    assert.deepEqual(other, { ok: false, code: "NOT_FOUND" });
    const wrongOrder = await issueGiftCard(repo, { purchaseId: "gcp_1", uid: "u_buyer", razorpayOrderId: "order_Other", paymentId: "p", code: CODE, now: 1 });
    assert.deepEqual(wrongOrder, { ok: false, code: "ORDER_MISMATCH" });
    assert.equal(repo.data(`giftCards/${cardIdFor(CODE)}`), undefined);
  });

  test("a purchase that is not awaiting payment cannot issue a card", async () => {
    const repo = new MemoryRepo();
    purchaseFixture(repo, { status: "FAILED" });
    const out = await issueGiftCard(repo, { purchaseId: "gcp_1", uid: "u_buyer", razorpayOrderId: "order_Gift0001", paymentId: "p", code: CODE, now: 1 });
    assert.deepEqual(out, { ok: false, code: "NOT_PAYABLE" });
  });
});

describe("redeeming a card into coins", () => {
  async function issued(repo: MemoryRepo) {
    purchaseFixture(repo);
    await issueGiftCard(repo, { purchaseId: "gcp_1", uid: "u_buyer", razorpayOrderId: "order_Gift0001", paymentId: "p", code: CODE, now: 1 });
  }

  test("credits the coins to the wallet once and marks the card redeemed", async () => {
    const repo = new MemoryRepo();
    await issued(repo);
    const out = await creditGiftCard(repo, "u_friend", CODE, 2_000);
    assert.deepEqual(out, { ok: true, coins: 500, balance: 500, alreadyRedeemed: false });
    assert.equal(repo.data("wallets/u_friend")?.balance, 500);
    const card = repo.data(`giftCards/${cardIdFor(CODE)}`);
    assert.equal(card?.status, "REDEEMED");
    assert.equal(card?.redeemedBy, "u_friend");
  });

  test("the ledger entry is keyed by the card, so it exists exactly once", async () => {
    const repo = new MemoryRepo();
    await issued(repo);
    await creditGiftCard(repo, "u_friend", CODE, 2_000);
    const again = await creditGiftCard(repo, "u_friend", CODE, 3_000);
    assert.deepEqual(again, { ok: true, coins: 500, balance: null, alreadyRedeemed: true });
    const entries = [...repo.docs.keys()].filter((k) => k.startsWith("wallets/u_friend/ledger/"));
    assert.equal(entries.length, 1, "one ledger entry");
    assert.equal(repo.data("wallets/u_friend")?.balance, 500, "balance credited once");
    const entry = repo.data(entries[0]);
    assert.equal(entry?.source, "GIFT_CARD");
    assert.equal(entry?.idempotencyKey, `giftcard:${cardIdFor(CODE)}`);
  });

  test("a card used by someone else is refused and nothing is written", async () => {
    const repo = new MemoryRepo();
    await issued(repo);
    await creditGiftCard(repo, "u_friend", CODE, 2_000);
    const before = repo.log.length;
    const out = await creditGiftCard(repo, "u_thief", CODE, 3_000);
    assert.deepEqual(out, { ok: false, code: "ALREADY_REDEEMED" });
    assert.equal(repo.log.length, before);
    assert.equal(repo.data("wallets/u_thief"), undefined);
  });

  test("a wrong code gives INVALID_CODE and writes nothing", async () => {
    const repo = new MemoryRepo();
    await issued(repo);
    const before = repo.log.length;
    const out = await creditGiftCard(repo, "u_friend", "ZZZZ2345EFGHJKMN", 2_000);
    assert.deepEqual(out, { ok: false, code: "INVALID_CODE" });
    assert.equal(repo.log.length, before);
    assert.equal(repo.data(`giftCards/${cardIdFor(CODE)}`)?.status, "ACTIVE");
  });
});

describe("limits on codes and purchases", () => {
  test("code entry allows five attempts per fifteen minutes, then locks until the window passes", () => {
    assert.equal(REDEEM_MAX_ATTEMPTS, 5);
    assert.equal(REDEEM_WINDOW_MS, 15 * 60 * 1000);
    let counter: { count: number; windowStart: number } | null = null;
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const r = countAttempt(counter, t0 + i * 1000, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS);
      assert.equal(r.allowed, true, `attempt ${i + 1}`);
      counter = r.next;
    }
    const locked = countAttempt(counter, t0 + 6_000, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS);
    assert.equal(locked.allowed, false, "sixth attempt refused");
    assert.ok(locked.retryAfterMs > 0 && locked.retryAfterMs <= REDEEM_WINDOW_MS);
    const later = countAttempt(locked.next, t0 + REDEEM_WINDOW_MS + 1, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS);
    assert.equal(later.allowed, true, "allowed again after the window");
  });

  test("a refused attempt still counts, so a stopped guesser stays locked", () => {
    let counter: { count: number; windowStart: number } | null = null;
    for (let i = 0; i < 8; i++) counter = countAttempt(counter, 5_000 + i, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS).next;
    assert.equal(counter?.count, 8);
  });

  test("purchases are capped at ten a day", () => {
    assert.equal(PURCHASE_MAX_PER_DAY, 10);
    let counter: { count: number; windowStart: number } | null = null;
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) {
      const r = countAttempt(counter, 1_000 + i, PURCHASE_MAX_PER_DAY, DAY);
      results.push(r.allowed);
      counter = r.next;
    }
    assert.equal(results.filter(Boolean).length, 10);
    assert.equal(results[10], false);
  });

  test("the day key is the UTC calendar day", () => {
    assert.equal(dayKey(Date.UTC(2026, 10, 7, 23, 59)), "2026-11-07");
  });
});

