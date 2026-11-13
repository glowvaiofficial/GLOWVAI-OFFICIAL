import { test } from "node:test";
import assert from "node:assert/strict";
import { readBlockSettings } from "@/lib/shop/homeLayout";

// The promos block: up to 4 admin promo cards, each with an optional picture. Same item rules as the other item blocks.
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const promos = (items: unknown) => readBlockSettings({ blocks: [{ id: "promos", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items } }] })["promos"];
const item = (over: Record<string, unknown> = {}) => ({ label: "Deal", sub: "Sub text", link: "/shop", image: "", ...over });

test("promo cards read with their pictures", () => {
  const got = promos([item({ label: "Free delivery", image: PNG }), item({ label: "No picture" })]);
  assert.equal(got?.items.length, 2);
  assert.equal(got?.items[0].label, "Free delivery");
  assert.equal(got?.items[0].image, PNG);
  assert.equal(got?.items[1].image, "");
});

test("more than 4 promo cards keeps the first 4", () => {
  const six = [1, 2, 3, 4, 5, 6].map((i) => item({ label: "Promo " + i }));
  assert.deepEqual(promos(six)?.items.map((i) => i.label), ["Promo 1", "Promo 2", "Promo 3", "Promo 4"]);
});

test("a promo card with a bad link is dropped, and the others stay", () => {
  const got = promos([item({ label: "Bad", link: "https://example.com" }), item({ label: "Also bad", link: "//evil.com" }), item({ label: "Good", link: "/shop/offers" })]);
  assert.deepEqual(got?.items.map((i) => i.label), ["Good"]);
});

test("a promo card with a bad picture keeps its text without a picture", () => {
  const got = promos([item({ image: "data:image/svg+xml;base64,PHN2Zz4=" })]);
  assert.equal(got?.items.length, 1);
  assert.equal(got?.items[0].image, "");
});

test("empty promo items give no override, so the built-in promo cards show", () => {
  assert.equal(promos([]), undefined);
});
