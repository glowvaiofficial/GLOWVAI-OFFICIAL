import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Source checks for the premium screens: real data only, no unverified claims, one order per checkout attempt.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const home = read("glowvai-app/features/shop/screens/ShopHomeScreen.tsx");
const homeParts = read("glowvai-app/features/shop/mobile/MobileHomeParts.tsx");
const cart = read("glowvai-app/features/commerce/CartScreen.tsx");
const review = read("glowvai-app/features/commerce/CheckoutReviewScreen.tsx");
const payment = read("glowvai-app/features/commerce/PaymentMethodScreen.tsx");
const premium = read("glowvai-app/features/commerce/components/premium.tsx");
const processing = read("glowvai-app/features/commerce/PaymentProcessingScreen.tsx");
const result = read("glowvai-app/features/commerce/PaymentResultScreens.tsx");
const tracking = read("glowvai-app/features/orders/OrderTrackingScreen.tsx");
const shopApi = read("glowvai-app/core/services/shopApi.ts");
const razorpay = read("glowvai-app/features/commerce/lib/razorpayCheckout.ts");

describe("mobile home", () => {
  test("content comes from the admin layout, with accents", () => {
    assert.match(home, /useHomeLayout\('mobile'\)/);
    assert.match(home, /sectionAccent\(id, /);
    assert.match(homeParts, /\/api\/shop\/home/);
    assert.match(homeParts, /\/api\/shop\/flash-sales/);
  });

  test("no hard-coded marketing images: only the existing built-in hero picture", () => {
    assert.doesNotMatch(homeParts, /\.(png|jpe?g|webp)['"]/i);
    assert.doesNotMatch(home, /\.(png|jpe?g|webp)['"]/i);
    assert.match(homeParts, /hero\?\.image \|\| HERO_IMAGE/);
  });

  test("the built-in offers use the real rules", () => {
    assert.match(homeParts, /COUPON_VALUES\.GLOW50/);
    assert.match(homeParts, /FREE_DELIVERY_ABOVE/);
  });

  test("Track Order follows a real order on its way", () => {
    assert.match(home, /activeOrder\(orders\)/);
    assert.match(home, /navigate\('orders-tracking', \{ orderId: onTheWay\.orderId \}\)/);
  });
});

describe("cart, delivery details and payment", () => {
  test("every step prices from computeCartTotals", () => {
    for (const source of [cart, review, payment]) assert.match(source, /computeCartTotals\(/);
    assert.match(premium, /totals\.grandTotal \+ tip/);
  });

  test("no unverified claims", () => {
    for (const source of [cart, review, payment, premium, result, tracking]) {
      assert.doesNotMatch(source, /256-bit|Verified Partners|24\/7|guaranteed/i);
    }
    assert.match(premium, /Payments are processed securely by Razorpay/);
  });

  test("no sample rider, name or phone number", () => {
    for (const source of [review, result, tracking]) assert.doesNotMatch(source, /Ravi|Karan|Aarav|98765/);
  });

  test("online options open Razorpay on the chosen method; cash on delivery stays", () => {
    assert.match(processing, /methodPrefillFor\(useCheckoutSession\.getState\(\)\.paymentChoice\)/);
    assert.match(razorpay, /method: options\.method\.method/);
    assert.match(payment, /role="switch"/);
  });

  test("one Idempotency-Key per checkout attempt", () => {
    assert.match(shopApi, /'Idempotency-Key': options\.idempotencyKey/);
    assert.match(processing, /idempotencyKey: attempt\.key/);
    assert.match(processing, /replayDecision\(result\.data\)/);
  });
});

describe("confirming and tracking", () => {
  test("the confirming screen reads the order's real status and backs off", () => {
    assert.match(result, /fetchOrderTracking\(orderId\)/);
    assert.match(result, /confirmCheckDelay\(attempts\.current\)/);
    assert.match(result, /document\.visibilityState === 'visible'/);
  });

  test("tracking shows only what the server sent", () => {
    assert.match(tracking, /etaText\(live\?\.estimateMinutes \?\? null\)/);
    assert.match(tracking, /riderView\(tracking\?\.rider \?\? null, riderFirst\)/);
    assert.match(tracking, /trackingLayout\(\{ live, cancelled, mapSupported: TRACKING_MAP_SUPPORTED \}\)/);
  });
});
