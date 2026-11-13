import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildProductShareMetadata, cleanText, productImageUrl } from "../../lib/shop/productShareMeta";

const SITE = "https://glowvai.in";
const OPTS = { siteUrl: SITE, brandName: "GLOW VAI", logoPath: "/logo/glowvai-logo-512.png" };
const PIC = "https://firebasestorage.googleapis.com/v0/b/x/o/spf.webp?alt=media";

describe("product share metadata", () => {
  test("uses the product's own first picture for Open Graph and Twitter", () => {
    const meta = buildProductShareMetadata({ id: "p1", name: "SPF 50 Sunscreen", brand: "Minimalist", price: 499, picture: PIC }, OPTS);
    assert.equal(meta.imageIsProductPicture, true);
    assert.equal(meta.openGraph.images[0].url, PIC);
    assert.deepEqual(meta.twitter.images, [PIC]);
    assert.equal(meta.twitter.card, "summary_large_image");
    assert.notEqual(meta.openGraph.images[0].url, `${SITE}${OPTS.logoPath}`);
  });

  test("falls back to the GlowVai logo when the product has no picture", () => {
    for (const picture of [null, undefined, "", "   "]) {
      const meta = buildProductShareMetadata({ id: "p1", name: "Serum", price: 300, picture }, OPTS);
      assert.equal(meta.imageIsProductPicture, false);
      assert.equal(meta.openGraph.images[0].url, `${SITE}/logo/glowvai-logo-512.png`);
      assert.equal(meta.twitter.images[0], `${SITE}/logo/glowvai-logo-512.png`);
    }
  });

  test("refuses unsafe picture links and uses the logo instead", () => {
    assert.equal(productImageUrl("javascript:alert(1)", SITE, OPTS.logoPath).isProductPicture, false);
    assert.equal(productImageUrl("http://insecure.example/a.webp", SITE, OPTS.logoPath).isProductPicture, false);
    assert.equal(productImageUrl("//evil.example/a.webp", SITE, OPTS.logoPath).isProductPicture, false);
    assert.equal(productImageUrl('https://x.example/a.webp" onerror="x', SITE, OPTS.logoPath).isProductPicture, false);
  });

  test("the title carries the brand, name and price", () => {
    const meta = buildProductShareMetadata({ id: "p1", name: "SPF 50", brand: "Minimalist", price: 1299, picture: PIC }, OPTS);
    assert.equal(meta.title, "Minimalist SPF 50 - ₹1,299 | GLOW VAI");
    assert.equal(meta.openGraph.title, meta.title);
    assert.match(meta.description, /Buy SPF 50 from Minimalist at ₹1,299 on GLOW VAI\./);
  });

  test("escapes markup in the title: angle brackets and control characters are removed", () => {
    const meta = buildProductShareMetadata(
      { id: "p1", name: '<img src=x onerror=alert(1)>Glow\u0007 "Serum"', brand: "<b>Brand</b>", price: 200, picture: PIC },
      OPTS,
    );
    assert.doesNotMatch(meta.title, /[<>\u0000-\u001f]/);
    assert.doesNotMatch(meta.description, /[<>]/);
    assert.match(meta.title, /Glow/);
    assert.equal(cleanText("  a \n b  ", 50), "a b");
  });

  test("long names and descriptions are capped", () => {
    const meta = buildProductShareMetadata({ id: "p1", name: "N".repeat(400), price: 10, description: "d".repeat(900), picture: PIC }, OPTS);
    assert.ok(meta.title.length <= 180);
    assert.ok(meta.description.length <= 300);
  });

  test("the canonical URL is the server-rendered product page, with the id encoded", () => {
    const meta = buildProductShareMetadata({ id: "a b/c", name: "X", price: 1, picture: PIC }, OPTS);
    assert.equal(meta.canonical, `${SITE}/product/a%20b%2Fc`);
    assert.equal(meta.openGraph.url, meta.canonical);
  });

  test("no price means the price is left out of the title", () => {
    const meta = buildProductShareMetadata({ id: "p1", name: "Toner", price: 0, picture: PIC }, OPTS);
    assert.equal(meta.title, "Toner | GLOW VAI");
  });
});
