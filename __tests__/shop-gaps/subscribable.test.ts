import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { NOT_SUBSCRIBABLE_MESSAGE, subscribableOf, subscriptionRefusal } from "../../lib/shop/subscribable";

describe("subscribable products", () => {
  test("only a literal true allows a subscription", () => {
    assert.equal(subscribableOf(true), true);
    assert.equal(subscribableOf(false), false);
    assert.equal(subscribableOf(undefined), false, "a product without the field (the default) cannot be subscribed to");
    assert.equal(subscribableOf(null), false);
    assert.equal(subscribableOf("true"), false, "a string is not a boolean");
    assert.equal(subscribableOf(1), false);
  });

  test("the subscribe route refuses a product that is not subscribable, with a clear message", () => {
    assert.equal(subscriptionRefusal({}), NOT_SUBSCRIBABLE_MESSAGE);
    assert.equal(subscriptionRefusal({ subscribable: false }), NOT_SUBSCRIBABLE_MESSAGE);
    assert.equal(subscriptionRefusal(null), NOT_SUBSCRIBABLE_MESSAGE);
    assert.match(NOT_SUBSCRIBABLE_MESSAGE, /cannot be subscribed to/);
  });

  test("a subscribable product passes the check", () => {
    assert.equal(subscriptionRefusal({ subscribable: true }), null);
  });
});
