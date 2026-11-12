import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { showSubscribePanel } from "../../lib/shop/subscribable";

describe("subscribe panel on the product page", () => {
  test("hidden for a product that is not marked subscribable (the default)", () => {
    assert.equal(showSubscribePanel({}), false);
    assert.equal(showSubscribePanel({ subscribable: false }), false);
    assert.equal(showSubscribePanel({ subscribable: "true" }), false, "a string is not the flag");
    assert.equal(showSubscribePanel(null), false);
  });

  test("shown only when the product is subscribable === true", () => {
    assert.equal(showSubscribePanel({ subscribable: true }), true);
  });
});
