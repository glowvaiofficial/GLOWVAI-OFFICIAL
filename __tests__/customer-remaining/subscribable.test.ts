import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { canSubscribeTo, fullArrivalWindow, readSubscribable } from "../../lib/shop/subscribable";

describe("subscribe gating", () => {
  test("default is false: a product with no flag is not subscribable", () => {
    assert.equal(readSubscribable(undefined), false);
    assert.equal(readSubscribable(null), false);
    assert.equal(canSubscribeTo({}), false);
    assert.equal(canSubscribeTo(null), false);
    assert.equal(canSubscribeTo(undefined), false);
  });

  test("only a true boolean enables it; strings and numbers do not", () => {
    assert.equal(readSubscribable(true), true);
    assert.equal(readSubscribable(false), false);
    assert.equal(readSubscribable("true"), false);
    assert.equal(readSubscribable(1), false);
    assert.equal(canSubscribeTo({ subscribable: true }), true);
    assert.equal(canSubscribeTo({ subscribable: false }), false);
    assert.equal(canSubscribeTo({ subscribable: "yes" }), false);
  });
});

describe("expected arrival window", () => {
  test("shown only with both bounds, in order", () => {
    const from = Date.UTC(2026, 10, 7, 12, 30);
    const to = Date.UTC(2026, 10, 7, 15, 30);
    assert.deepEqual(fullArrivalWindow({ from, to }), { from, to });
    assert.equal(fullArrivalWindow({ from, to: null }), null);
    assert.equal(fullArrivalWindow({ from: null, to }), null);
    assert.equal(fullArrivalWindow({ from: to, to: from }), null);
    assert.equal(fullArrivalWindow(null), null);
    assert.equal(fullArrivalWindow(undefined), null);
  });
});
