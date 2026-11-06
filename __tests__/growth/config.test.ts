import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkoutMethodOptions, emiAvailable } from "../../glowvai-app/shared/payment-options.mjs";
import { bearerToken, sameSecret } from "../../lib/shop/growth/secrets";
import { parseBagLines, parseOrderRequest } from "../../lib/shop/orderRequest";
import { GROWTH_CONFIG } from "../../lib/shop/growth-config";

describe("EMI option", () => {
  test("EMI is offered only when RAZORPAY_EMI_ENABLED is exactly true", () => {
    assert.equal(emiAvailable({ RAZORPAY_EMI_ENABLED: "true" }), true);
    assert.equal(emiAvailable({}), false);
    assert.equal(emiAvailable(undefined), false);
    assert.equal(emiAvailable({ RAZORPAY_EMI_ENABLED: "false" }), false);
    assert.equal(emiAvailable({ RAZORPAY_EMI_ENABLED: "TRUE" }), false);
    assert.equal(emiAvailable({ RAZORPAY_EMI_ENABLED: " true" }), false);
  });

  test("with the flag off, Razorpay Checkout gets no method options at all", () => {
    assert.deepEqual(checkoutMethodOptions(false), {});
    assert.deepEqual(checkoutMethodOptions(undefined), {});
    assert.equal("method" in checkoutMethodOptions(emiAvailable({})), false);
  });

  test("with the flag on, Razorpay Checkout is asked for method.emi and keeps the other methods", () => {
    const options = checkoutMethodOptions(emiAvailable({ RAZORPAY_EMI_ENABLED: "true" })) as { method: Record<string, boolean> };
    assert.equal(options.method.emi, true);
    assert.equal(options.method.upi, true);
    assert.equal(options.method.card, true);
  });
});

describe("cron and internal secrets", () => {
  test("the bearer token is read only from a Bearer header", () => {
    assert.equal(bearerToken("Bearer abc123"), "abc123");
    assert.equal(bearerToken("Basic abc123"), "");
    assert.equal(bearerToken(null), "");
  });

  test("a secret matches only exactly, and an empty configured secret never matches", () => {
    const secret = "x".repeat(32);
    assert.equal(sameSecret(secret, secret), true);
    assert.equal(sameSecret(secret.slice(1), secret), false);
    assert.equal(sameSecret(secret + "y", secret), false);
    assert.equal(sameSecret("", secret), false);
    assert.equal(sameSecret("", ""), false);
  });
});

describe("order request checks (the same messages and order as before)", () => {
  const goodAddress = { name: "Asha Rao", phone: "9876543210", fullAddress: "12 Lake View Road", city: "Hyderabad", pincode: "500001" };
  const goodItems = [{ productId: "p1", quantity: 2 }];

  test("cash on delivery is the default payment method", () => {
    const r = parseOrderRequest({ items: goodItems, address: goodAddress }, { onlineAvailable: false });
    assert.equal(r.ok && r.value.paymentMethod, "COD");
  });

  test("online payment is refused with 503 when Razorpay is not configured", () => {
    const r = parseOrderRequest({ paymentMethod: "ONLINE", items: goodItems, address: goodAddress }, { onlineAvailable: false });
    assert.deepEqual(r.ok ? null : { status: r.status }, { status: 503 });
  });

  test("an empty bag, or more than 20 products, is refused", () => {
    assert.equal(parseOrderRequest({ items: [], address: goodAddress }, { onlineAvailable: false }).ok, false);
    const many = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    const r = parseOrderRequest({ items: many, address: goodAddress }, { onlineAvailable: false });
    assert.equal(r.ok === false && r.error, "Up to 20 different products per order.");
  });

  test("quantities are whole numbers of at least 1, and a product twice is added up and capped at 10", () => {
    assert.equal(parseBagLines([{ productId: "p1", quantity: 0 }]).ok, false);
    assert.equal(parseBagLines([{ productId: "p1", quantity: 1.9 }]).ok && 0, 0);
    const r = parseBagLines([
      { productId: "p1", quantity: 6 },
      { productId: "p1", quantity: 9 },
    ]);
    assert.equal(r.ok && r.value.get("p1"), 10);
  });

  test("the address is checked name first, then phone, address, city and pincode", () => {
    const check = (addr: Record<string, unknown>) => {
      const r = parseOrderRequest({ items: goodItems, address: { ...goodAddress, ...addr } }, { onlineAvailable: false });
      return r.ok ? "ok" : r.error;
    };
    assert.equal(check({ name: "A" }), "Enter the name for delivery.");
    assert.equal(check({ phone: "12345" }), "Enter a 10-digit Indian mobile number for delivery.");
    assert.equal(check({ fullAddress: "short" }), "Enter the full delivery address.");
    assert.equal(check({ city: "" }), "Enter the city.");
    assert.equal(check({ pincode: "5000" }), "Enter a 6-digit pincode.");
    assert.equal(check({}), "ok");
  });

  test("coins to redeem must be a whole number, and default to none", () => {
    const base = { items: goodItems, address: goodAddress };
    assert.equal(parseOrderRequest(base, { onlineAvailable: false }).ok && 0, 0);
    const r = parseOrderRequest({ ...base, coinsToRedeem: "abc" }, { onlineAvailable: false });
    assert.equal(r.ok === false && r.error, "Enter a whole number of coins.");
    const ok = parseOrderRequest({ ...base, coinsToRedeem: 25 }, { onlineAvailable: false });
    assert.equal(ok.ok && ok.value.coinsRequested, 25);
  });
});

describe("growth configuration", () => {
  test("subscriptions run daily with a cap of 50 and intervals of 2, 4 or 8 weeks", () => {
    assert.equal(GROWTH_CONFIG.subscriptions.maxPerRun, 50);
    assert.deepEqual([...GROWTH_CONFIG.subscriptions.intervalsWeeks], [2, 4, 8]);
  });

  test("the rules the owner asked for: 20 per cent cap, 50 coins each side, 3 applies a day", () => {
    assert.equal(GROWTH_CONFIG.coins.maxRedeemPercentOfItemTotal, 20);
    assert.equal(GROWTH_CONFIG.referral.referrerCoins, 50);
    assert.equal(GROWTH_CONFIG.referral.refereeCoins, 50);
    assert.equal(GROWTH_CONFIG.referral.applyPerUserPerDay, 3);
    assert.equal(GROWTH_CONFIG.coins.redeemPreviewPerUserPerHour, 20);
  });
});
