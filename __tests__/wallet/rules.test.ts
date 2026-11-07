import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { COINS_PER_RUPEE, DAILY_TOPUP_CAP_RUPEES, MAX_BALANCE_COINS, MAX_TOPUP_RUPEES, MIN_TOPUP_RUPEES, TOPUP_PRESETS_RUPEES } from "../../lib/shop/wallet-config";
import { GROWTH_CONFIG } from "../../lib/shop/growth-config";
import {
  coinsForAmountLine,
  coinsForRupees,
  countsAgainstCap,
  dailyCapRemaining,
  effectiveTopupStatus,
  exceedsBalanceCap,
  exceedsDailyCap,
  istDayKey,
  ledgerLabel,
  paiseForRupees,
  parseTopupRupees,
  projectLedgerEntry,
  rateLine,
  rupeesForCoins,
} from "../../lib/shop/wallet/rules";

const MIN = 60_000;

describe("rate and conversion", () => {
  test("launch rate is one coin per rupee, and the config holds it", () => {
    assert.equal(COINS_PER_RUPEE, 1);
    assert.equal(coinsForRupees(500), 500);
    assert.equal(rupeesForCoins(500), 500);
    assert.equal(paiseForRupees(500), 50_000);
  });

  test("a coin bought with the top-up is worth exactly what the checkout discount says", () => {
    // COINS_PER_RUPEE coins are bought for one rupee; each coin takes rupeesPerCoin off at checkout. They must not
    // multiply to more than one rupee, or a top-up could be a discount loop.
    assert.equal(COINS_PER_RUPEE * GROWTH_CONFIG.coins.rupeesPerCoin, 1);
  });

  test("the displayed rate and the amount line", () => {
    assert.equal(rateLine(), "₹1 = 1 GlowVai Coin");
    assert.equal(coinsForAmountLine(500), "₹500 gives you 500 Glow Coins");
  });

  test("partial coins never round up to a rupee", () => {
    assert.equal(rupeesForCoins(-5), 0);
    assert.equal(rupeesForCoins(99.9), 99);
  });
});

describe("amount bounds", () => {
  test("whole rupees from the minimum to the maximum are accepted", () => {
    assert.deepEqual(parseTopupRupees(MIN_TOPUP_RUPEES), { ok: true, rupees: 100 });
    assert.deepEqual(parseTopupRupees(MAX_TOPUP_RUPEES), { ok: true, rupees: 10_000 });
    assert.deepEqual(parseTopupRupees("750"), { ok: true, rupees: 750 });
  });

  test("below the minimum and above the maximum are refused with a code", () => {
    const low = parseTopupRupees(99);
    const high = parseTopupRupees(MAX_TOPUP_RUPEES + 1);
    assert.equal(low.ok === false && low.code, "BELOW_MIN");
    assert.equal(high.ok === false && high.code, "ABOVE_MAX");
  });

  test("fractions, exponents, negatives and other types are refused", () => {
    for (const bad of [250.5, "250.5", "5e2", -100, "", null, undefined, {}, [], NaN, Infinity, "1234567890"]) {
      const r = parseTopupRupees(bad);
      assert.equal(r.ok, false, `value ${String(bad)}`);
    }
    const frac = parseTopupRupees(250.5);
    assert.equal(frac.ok === false && frac.code, "NOT_WHOLE_RUPEES");
  });

  test("every preset is inside the bounds", () => {
    assert.ok(TOPUP_PRESETS_RUPEES.length > 0);
    for (const p of TOPUP_PRESETS_RUPEES) {
      assert.equal(parseTopupRupees(p).ok, true, `preset ${p}`);
    }
    assert.deepEqual([...TOPUP_PRESETS_RUPEES], [100, 250, 500, 1000]);
  });
});

describe("daily cap and balance cap", () => {
  test("a top-up that reaches the daily cap exactly is allowed, one more rupee is not", () => {
    assert.equal(exceedsDailyCap(DAILY_TOPUP_CAP_RUPEES - 500, 500), false);
    assert.equal(exceedsDailyCap(DAILY_TOPUP_CAP_RUPEES - 500, 501), true);
    assert.equal(dailyCapRemaining(DAILY_TOPUP_CAP_RUPEES - 500), 500);
    assert.equal(dailyCapRemaining(DAILY_TOPUP_CAP_RUPEES + 300), 0);
  });

  test("the balance cap is inclusive at the maximum", () => {
    assert.equal(exceedsBalanceCap(MAX_BALANCE_COINS - 100, 100), false);
    assert.equal(exceedsBalanceCap(MAX_BALANCE_COINS - 99, 100), true);
  });

  test("open top-ups count against the cap until they expire, expired and failed ones do not", () => {
    const now = 1_000_000_000_000;
    assert.equal(countsAgainstCap({ status: "CREATED", createdAt: now - 5 * MIN }, now), true);
    assert.equal(countsAgainstCap({ status: "CREATED", createdAt: now - 31 * MIN }, now), false);
    assert.equal(countsAgainstCap({ status: "PAID", createdAt: now - 90 * MIN }, now), true);
    assert.equal(countsAgainstCap({ status: "FAILED", createdAt: now }, now), false);
    assert.equal(countsAgainstCap({ status: "EXPIRED", createdAt: now }, now), false);
  });
});

describe("expiry", () => {
  const created = 1_000_000_000_000;
  test("a CREATED top-up is still open at exactly 30 minutes and expired after", () => {
    assert.equal(effectiveTopupStatus("CREATED", created, created + 30 * MIN), "CREATED");
    assert.equal(effectiveTopupStatus("CREATED", created, created + 30 * MIN + 1), "EXPIRED");
  });

  test("only CREATED can expire; PAID, FAILED and EXPIRED are returned as stored", () => {
    const late = created + 90 * MIN;
    assert.equal(effectiveTopupStatus("PAID", created, late), "PAID");
    assert.equal(effectiveTopupStatus("FAILED", created, late), "FAILED");
    assert.equal(effectiveTopupStatus("EXPIRED", created, late), "EXPIRED");
  });

  test("the day key is the India calendar day, not the UTC day", () => {
    // 2026-11-07 00:20 IST is 2026-11-06 18:50 UTC.
    assert.equal(istDayKey(Date.UTC(2026, 10, 6, 18, 50)), "2026-11-07");
    assert.equal(istDayKey(Date.UTC(2026, 10, 6, 18, 20)), "2026-11-06");
  });
});

describe("customer-facing history projection", () => {
  test("labels map from the ledger source", () => {
    assert.equal(ledgerLabel("TOPUP"), "Top-up");
    assert.equal(ledgerLabel("CHECKOUT_REDEMPTION"), "Order discount");
    assert.equal(ledgerLabel("REFERRAL_REFERRER"), "Referral reward");
    assert.equal(ledgerLabel("REFERRAL_REFEREE"), "Referral reward");
    assert.equal(ledgerLabel("GIFT_CARD"), "Gift card");
    assert.equal(ledgerLabel("ADMIN_ADJUSTMENT"), "Adjustment by GlowVai");
    assert.equal(ledgerLabel("SOMETHING_NEW"), "Glow Coins");
  });

  test("only the customer fields leave the server", () => {
    const row = projectLedgerEntry("e1", {
      type: "DEBIT",
      source: "CHECKOUT_REDEMPTION",
      amount: 40,
      signed: -40,
      balanceAfter: 10,
      actor: "staff@glowvai",
      idempotencyKey: "checkout:GV-1",
      uid: "customer-uid-123",
      expiresAt: null,
      reason: "Used on order GV-1",
      orderId: "GV-1",
      createdAt: 5,
    });
    assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "id", "label", "orderId", "reason", "signed", "type"]);
    assert.equal(row.signed, -40);
    assert.equal(row.label, "Order discount");
  });
});
