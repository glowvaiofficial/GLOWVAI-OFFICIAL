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
