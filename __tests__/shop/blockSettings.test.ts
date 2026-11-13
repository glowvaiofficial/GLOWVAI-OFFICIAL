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
