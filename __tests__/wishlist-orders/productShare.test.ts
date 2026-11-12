import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { productShareUrl } from "../../lib/shop/productShare";

describe("product share link", () => {
  test("is the canonical shop link with the product id", () => {
    assert.equal(productShareUrl("prod-min-spf50"), "https://glowvai.in/shop?product=prod-min-spf50");
  });

  test("encodes the id so the link carries exactly one product", () => {
    const url = new URL(productShareUrl("a&b=c d"));
    assert.equal(url.origin, "https://glowvai.in");
    assert.equal(url.pathname, "/shop");
    assert.equal(url.searchParams.get("product"), "a&b=c d");
    assert.equal([...url.searchParams.keys()].length, 1);
  });
});
