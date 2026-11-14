import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SEARCH_HINTS, HINT_INTERVAL_MS, nextHintIndex } from "../../glowvai-app/features/shop/shared/searchHints";
import { cartBadgeLabel } from "../../glowvai-app/features/shop/shared/cartBadge";

describe("search hint rotation", () => {
  test("moves to the next hint and wraps back to the first", () => {
    const n = SEARCH_HINTS.length;
    assert.ok(n > 1, "more than one hint to rotate through");
    assert.equal(nextHintIndex(0, n), 1);
    assert.equal(nextHintIndex(n - 2, n), n - 1);
    assert.equal(nextHintIndex(n - 1, n), 0);
  });

  test("visits every hint once per cycle", () => {
    const n = SEARCH_HINTS.length;
    const seen = new Set<number>();
    let i = 0;
    for (let step = 0; step < n; step++) {
      seen.add(i);
      i = nextHintIndex(i, n);
    }
    assert.equal(seen.size, n);
    assert.equal(i, 0);
  });

  test("an empty list stays at 0", () => {
    assert.equal(nextHintIndex(0, 0), 0);
    assert.equal(nextHintIndex(5, -1), 0);
  });

  test("rotates every 3 seconds and has no empty hints", () => {
    assert.equal(HINT_INTERVAL_MS, 3000);
    for (const hint of SEARCH_HINTS) assert.ok(hint.trim().length > 0);
  });
});

describe("cart count label", () => {
  test("zero shows nothing", () => {
    assert.equal(cartBadgeLabel(0), null);
  });

  test("negative or non-finite counts show nothing", () => {
    assert.equal(cartBadgeLabel(-3), null);
    assert.equal(cartBadgeLabel(Number.NaN), null);
  });

  test("small counts show as they are", () => {
    assert.equal(cartBadgeLabel(1), "1");
    assert.equal(cartBadgeLabel(12), "12");
    assert.equal(cartBadgeLabel(99), "99");
  });

  test("counts above 99 are capped at 99+", () => {
    assert.equal(cartBadgeLabel(100), "99+");
    assert.equal(cartBadgeLabel(1234), "99+");
  });
});
