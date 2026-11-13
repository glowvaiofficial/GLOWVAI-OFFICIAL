import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { legacyShopProductPath } from "../../lib/shop/productShare";

describe("legacy /shop?product= links", () => {
  test("move to the product page", () => {
    assert.equal(legacyShopProductPath(new URLSearchParams("product=abc-123")), "/product/abc-123");
  });

  test("are left alone for the shop app's own hand-off and for unsafe values", () => {
    assert.equal(legacyShopProductPath(new URLSearchParams("product=abc&src=share")), null);
    assert.equal(legacyShopProductPath(new URLSearchParams("product=../x")), null);
    assert.equal(legacyShopProductPath(new URLSearchParams("")), null);
  });
});
