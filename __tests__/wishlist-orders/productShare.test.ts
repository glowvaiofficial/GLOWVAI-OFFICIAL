import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { productShareUrl } from "../../lib/shop/productShare";

describe("product share link", () => {
  test("is the server-rendered product page with the product id", () => {
    assert.equal(productShareUrl("prod-min-spf50"), "https://glowvai.in/product/prod-min-spf50");
  });

  test("encodes the id so the link carries exactly one product path segment", () => {
    const url = new URL(productShareUrl("a&b=c d"));
    assert.equal(url.origin, "https://glowvai.in");
    assert.equal(url.pathname, "/product/a%26b%3Dc%20d");
    assert.equal(url.search, "");
  });
});
