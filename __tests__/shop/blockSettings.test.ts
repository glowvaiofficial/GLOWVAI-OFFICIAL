import { test } from "node:test";
import assert from "node:assert/strict";
import { readBlockSettings } from "@/lib/shop/homeLayout";

test("a block with items shows its content, limited to its item count", () => {
  const got = readBlockSettings({ blocks: [{ id: "mini-banners", enabled: true, position: 0, settings: { title: "Picks", background: "#112233", textColor: "", items: [1, 2, 3, 4].map((i) => ({ label: "Item " + i, sub: "", link: "/shop" })) } }] });
  assert.equal(got["mini-banners"]?.items.length, 3);
  assert.equal(got["mini-banners"]?.background, "#112233");
});

test("a block with no items is left out, so it keeps its placeholder", () => {
  assert.equal(readBlockSettings({ blocks: [{ id: "offers", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items: [] } }] })["offers"], undefined);
});

test("bad links, empty labels and bad colours are dropped", () => {
  const got = readBlockSettings({ blocks: [{ id: "trust", enabled: true, position: 0, settings: { title: "x".repeat(70), background: "red", textColor: "#fff", items: [{ label: "Ok", sub: "", link: "//evil" }, { label: "", sub: "", link: "/shop" }, { label: "Good", sub: "s", link: "/shop" }] } }] });
  assert.equal(got["trust"]?.items.length, 1);
  assert.equal(got["trust"]?.items[0].label, "Good");
  assert.equal(got["trust"]?.title, "");
  assert.equal(got["trust"]?.background, "");
});

test("blocks that take no items ignore them", () => {
  assert.equal(readBlockSettings({ blocks: [{ id: "deals", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items: [{ label: "x", sub: "", link: "" }] } }] })["deals"], undefined);
});

// ---- Item pictures: a small base64 data URL of webp, jpeg or png. Anything else means no picture; the item stays.
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const withImage = (image: unknown) => readBlockSettings({ blocks: [{ id: "brands", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items: [{ label: "Acme", sub: "", link: "/shop", image }] } }] })["brands"]?.items;

test("a valid webp, jpeg or png picture is kept", () => {
  assert.equal(withImage("data:image/webp;base64,UklGRg==")?.[0].image, "data:image/webp;base64,UklGRg==");
  assert.equal(withImage("data:image/jpeg;base64,/9j/4A==")?.[0].image, "data:image/jpeg;base64,/9j/4A==");
  assert.equal(withImage(PNG)?.[0].image, PNG);
});

test("a picture of the wrong type (svg) is rejected, and the item stays", () => {
  const items = withImage("data:image/svg+xml;base64,PHN2Zz4=");
  assert.equal(items?.length, 1);
  assert.equal(items?.[0].label, "Acme");
  assert.equal(items?.[0].image, "");
});

test("a picture over 200,000 characters is rejected, and the item stays", () => {
  const atLimit = "data:image/png;base64," + "A".repeat(200_000 - "data:image/png;base64,".length);
  assert.equal(atLimit.length, 200_000);
  assert.equal(withImage(atLimit)?.[0].image, atLimit);
  const tooBig = atLimit + "A";
  const items = withImage(tooBig);
  assert.equal(items?.length, 1);
  assert.equal(items?.[0].image, "");
});

test("a bad picture (not base64, not a string) keeps the item without a picture", () => {
  for (const bad of ["data:image/png;base64,<script>", "https://example.com/a.png", 42, null, { x: 1 }]) {
    const items = withImage(bad);
    assert.equal(items?.length, 1);
    assert.equal(items?.[0].image, "");
  }
});

test("an empty string or a missing picture means no picture", () => {
  assert.equal(withImage("")?.[0].image, "");
  assert.equal(withImage(undefined)?.[0].image, "");
});

// ---- Mini banners and offers strip: picture, link, title and item limits.
const promoBlock = (id: "mini-banners" | "offers", settings: Record<string, unknown>) =>
  readBlockSettings({ blocks: [{ id, enabled: true, position: 0, settings }] })[id];
const item = (over: Record<string, unknown> = {}) => ({ label: "Deal", sub: "Sub text", link: "/shop", image: "", ...over });

test("offers keep at most 3 items, and mini banners at most 3", () => {
  const five = [1, 2, 3, 4, 5].map((i) => item({ label: "Offer " + i }));
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: five })?.items.length, 3);
  assert.equal(promoBlock("mini-banners", { title: "", background: "", textColor: "", items: five })?.items.length, 3);
});

test("invalid items do not use up the limit: the first 3 valid items show", () => {
  const items = [item({ label: "" }), item({ link: "//evil" }), item({ label: "A" }), item({ label: "B" }), item({ label: "C" }), item({ label: "D" })];
  const got = promoBlock("offers", { title: "", background: "", textColor: "", items });
  assert.deepEqual(got?.items.map((i) => i.label), ["A", "B", "C"]);
});

test("item order is kept", () => {
  const got = promoBlock("mini-banners", { title: "", background: "", textColor: "", items: [item({ label: "First" }), item({ label: "Second" })] });
  assert.deepEqual(got?.items.map((i) => i.label), ["First", "Second"]);
});

test("a title is kept when set, and a title over 60 characters is dropped", () => {
  assert.equal(promoBlock("offers", { title: "Today's offers", background: "", textColor: "", items: [item()] })?.title, "Today's offers");
  assert.equal(promoBlock("offers", { title: "x".repeat(61), background: "", textColor: "", items: [item()] })?.title, "");
  assert.equal(promoBlock("offers", { title: "x".repeat(60), background: "", textColor: "", items: [item()] })?.title, "x".repeat(60));
});

test("a valid internal link is kept on the item", () => {
  for (const link of ["/shop", "/shop/category/shoes?sort=new", ""]) {
    assert.equal(promoBlock("mini-banners", { title: "", background: "", textColor: "", items: [item({ link })] })?.items[0].link, link);
  }
});

test("external, protocol-relative, backslash and whitespace links are dropped with their item", () => {
  for (const link of ["https://example.com", "javascript:alert(1)", "//evil.com", "/a\b", "/has space", "shop"]) {
    assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ link })] }), undefined, link);
  }
});

test("labels over 40 and subs over 80 characters are dropped", () => {
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ label: "x".repeat(41) })] }), undefined);
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ sub: "x".repeat(81) })] }), undefined);
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ label: "x".repeat(40), sub: "" })] })?.items.length, 1);
});

test("a valid picture on a mini banner or offer is kept with its item", () => {
  assert.equal(promoBlock("mini-banners", { title: "", background: "", textColor: "", items: [item({ image: PNG })] })?.items[0].image, PNG);
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ image: "data:image/jpeg;base64,/9j/4A==" })] })?.items[0].image, "data:image/jpeg;base64,/9j/4A==");
});

test("a bad picture on an offer keeps the item without a picture", () => {
  const got = promoBlock("offers", { title: "", background: "", textColor: "", items: [item({ image: "data:image/gif;base64,R0lG" })] });
  assert.equal(got?.items.length, 1);
  assert.equal(got?.items[0].image, "");
});

test("a block whose items are not an array is left out", () => {
  assert.equal(promoBlock("offers", { title: "", background: "", textColor: "", items: "nope" }), undefined);
  assert.equal(promoBlock("mini-banners", { title: "", background: "", textColor: "" }), undefined);
});

// ---- Category tiles (the categories block). Up to 8 tiles; a picture is optional; a bad link keeps the tile (it opens the browse page).
const categoriesOf = (items: unknown) => readBlockSettings({ blocks: [{ id: "categories", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items } }] })["categories"]?.items;

test("category tiles are read with their pictures", () => {
  const items = categoriesOf([{ label: "Serums", sub: "12 products", link: "/shop/serums", image: PNG }, { label: "Masks", sub: "", link: "", image: "" }]);
  assert.equal(items?.length, 2);
  assert.deepEqual(items?.[0], { label: "Serums", sub: "12 products", link: "/shop/serums", image: PNG });
  assert.equal(items?.[1].image, "");
});

test("more than 8 category tiles keeps the first 8", () => {
  const items = categoriesOf(Array.from({ length: 10 }, (_, i) => ({ label: "Tile " + i, sub: "", link: "", image: "" })));
  assert.equal(items?.length, 8);
  assert.equal(items?.[7].label, "Tile 7");
});

test("a bad category link is dropped alone and the tile is kept", () => {
  for (const bad of ["//evil.example", "/a\b", "https://example.com", "/has space"]) {
    const items = categoriesOf([{ label: "Serums", sub: "", link: bad, image: "" }]);
    assert.equal(items?.length, 1);
    assert.equal(items?.[0].label, "Serums");
    assert.equal(items?.[0].link, "");
  }
});

test("empty category items give no override, so the built-in tiles show", () => {
  assert.equal(categoriesOf([]), undefined);
  assert.equal(categoriesOf([{ label: "", sub: "", link: "", image: "" }]), undefined);
});
