import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildProductShareMetadata, isShareableImageUrl } from "../../lib/shop/productShareMeta";
import { legacyShopProductPath, productShareUrl } from "../../lib/shop/productShare";

const base = {
  key: "lf6Yq2Xk9aBc",
  name: "Dew Barrier Daily Hydrator",
  brand: "Minimalist",
  description: "Lightweight gel-cream for Indian humidity.",
  price: 499,
  image: "https://storage.googleapis.com/glowvai/products/dew.jpg",
};

describe("product share metadata", () => {
  test("uses the product's own title, canonical URL and picture", () => {
    const m = buildProductShareMetadata(base);
    assert.equal(m.title, "Minimalist Dew Barrier Daily Hydrator");
    assert.equal(m.alternates?.canonical, "https://glowvai.in/product/lf6Yq2Xk9aBc");
    const og = m.openGraph as { images?: { url: string; alt: string }[]; url?: string };
    assert.equal(og.url, "https://glowvai.in/product/lf6Yq2Xk9aBc");
    assert.deepEqual(og.images, [{ url: base.image, alt: base.name }]);
    const tw = m.twitter as { card?: string; images?: string[] };
    assert.equal(tw.card, "summary_large_image");
    assert.deepEqual(tw.images, [base.image]);
  });

  test("never falls back to the site logo when the product has no picture", () => {
    const m = buildProductShareMetadata({ ...base, image: null });
    assert.equal((m.openGraph as { images?: unknown }).images, undefined);
    assert.equal((m.twitter as { card?: string }).card, "summary");
  });

  test("rejects non-https or malformed picture URLs", () => {
    assert.equal(isShareableImageUrl("http://example.com/a.jpg"), false);
    assert.equal(isShareableImageUrl("/images/a.jpg"), false);
    assert.equal(isShareableImageUrl("not a url"), false);
    assert.equal(isShareableImageUrl(null), false);
    assert.equal(isShareableImageUrl(base.image), true);
  });

  test("describes the product with its description, trimmed to 160 characters", () => {
    const long = buildProductShareMetadata({ ...base, description: "word ".repeat(80) });
    assert.ok(String(long.description).length <= 160);
    assert.ok(String(long.description).endsWith("…"));
  });

  test("falls back to the price when there is no description", () => {
    const m = buildProductShareMetadata({ ...base, description: "   " });
    assert.match(String(m.description), /Price ₹499/);
  });
});

describe("legacy /shop?product= links", () => {
  test("move to the product page", () => {
    assert.equal(legacyShopProductPath(new URLSearchParams("product=abc-123")), "/product/abc-123");
  });

  test("are left alone for the shop app's own hand-off and for unsafe values", () => {
    assert.equal(legacyShopProductPath(new URLSearchParams("product=abc&src=share")), null);
    assert.equal(legacyShopProductPath(new URLSearchParams("product=../x")), null);
    assert.equal(legacyShopProductPath(new URLSearchParams("")), null);
  });

  test("share links are the product page, not the shop", () => {
    assert.equal(productShareUrl("abc"), "https://glowvai.in/product/abc");
  });
});
