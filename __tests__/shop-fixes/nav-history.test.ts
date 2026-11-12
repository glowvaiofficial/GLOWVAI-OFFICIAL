import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildState, entryFromState, popDecision, restoreTarget, safeParams, sameEntry, type NavEntry } from "../../glowvai-app/context/navHistory";

const entry = (screen: string, trail: string[] = [], params: unknown = null): NavEntry => ({ screen, params, trail });

describe("history entries", () => {
  test("an entry round-trips through the history state and keeps the router's own keys", () => {
    const state = buildState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [] }, entry("location-setup", ["shop-home", "cart-tab"], { returnTo: "checkout-review" }));
    assert.equal((state as Record<string, unknown>).__NA, true, "Next.js router state is kept");
    assert.deepEqual(entryFromState(state), entry("location-setup", ["shop-home", "cart-tab"], { returnTo: "checkout-review" }));
  });

  test("state that is not ours is ignored", () => {
    assert.equal(entryFromState(null), null);
    assert.equal(entryFromState({ __NA: true }), null);
    assert.equal(entryFromState({ glowvai: 2, screen: "home", trail: [] }), null);
    assert.equal(entryFromState({ glowvai: 1, screen: "<script>", trail: [] }), null);
  });

  test("a bad trail entry is dropped, not trusted", () => {
    assert.deepEqual(entryFromState({ glowvai: 1, screen: "cart-tab", trail: ["shop-home", 5, "A B"] }), entry("cart-tab", ["shop-home"]));
  });

  test("params that cannot be stored are dropped rather than breaking navigation", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(safeParams(circular), null);
    assert.deepEqual(safeParams({ productId: "p1" }), { productId: "p1" });
  });
});

describe("Back moves one step and never leaves checkout for home with items in the bag", () => {
  test("Back from checkout steps to the previous step (not home)", () => {
    assert.equal(popDecision("location-setup", "address-list", 2), "apply");
    assert.equal(popDecision("checkout-review", "cart-tab", 2), "apply");
    assert.equal(popDecision("location-map-picker", "location-setup", 1), "apply");
  });

  test("Back from checkout to home is refused while the bag has items", () => {
    assert.equal(popDecision("location-setup", "shop-home", 1), "block");
    assert.equal(popDecision("checkout-review", "home", 3), "block");
  });

  test("Back from checkout to home is allowed when the bag is empty", () => {
    assert.equal(popDecision("location-setup", "shop-home", 0), "apply");
  });

  test("the bag and the product screen are ordinary steps, so Back from them is never blocked", () => {
    assert.equal(popDecision("cart-tab", "shop-home", 2), "apply");
    assert.equal(popDecision("shop-product", "shop-home", 2), "apply");
  });
});

describe("reload and forward restore the same step, or fall back", () => {
  test("a checkout step restores when the bag has items", () => {
    const r = restoreTarget(entry("address-add", ["cart-tab"], { addressId: "a1" }), 2);
    assert.equal(r.fallback, false);
    assert.equal(r.entry.screen, "address-add");
  });

  test("a checkout step falls back to the shop home when the bag is empty", () => {
    const r = restoreTarget(entry("checkout-review", ["cart-tab"]), 0);
    assert.equal(r.fallback, true);
    assert.equal(r.entry.screen, "shop-home");
  });

  test("payment processing is never restored, so it cannot place an order again; it falls back to the bag", () => {
    const r = restoreTarget(entry("checkout-payment-processing", ["checkout-payment-method"], { method: "upi" }), 1);
    assert.equal(r.fallback, true);
    assert.equal(r.entry.screen, "cart-tab");
  });

  test("the shop product and the bag restore as they were", () => {
    assert.deepEqual(restoreTarget(entry("shop-product", ["shop-home"], { productId: "p1" }), 0).entry, entry("shop-product", ["shop-home"], { productId: "p1" }));
    assert.equal(restoreTarget(entry("cart-tab", ["shop-home"]), 1).fallback, false);
  });

  test("an unchanged entry is recognised so a repeated popstate does not re-render", () => {
    assert.equal(sameEntry(entry("shop-product", ["shop-home"], { productId: "p1" }), entry("shop-product", ["shop-home"], { productId: "p1" })), true);
    assert.equal(sameEntry(entry("shop-product", ["shop-home"], { productId: "p1" }), entry("shop-product", ["shop-home"], { productId: "p2" })), false);
  });
});
