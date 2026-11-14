import { test } from "node:test";
import assert from "node:assert/strict";
import { readBlockSettings } from "@/lib/shop/homeLayout";

// Top brands: each brand is a name with an optional logo. The shop reads the admin's list and checks it again here.
const LOGO = "data:image/png;base64,iVBORw0KGgo=";
const brandsOf = (items: unknown[]) =>
  readBlockSettings({ blocks: [{ id: "brands", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items } }] })["brands"];
const brand = (label: string, image = "") => ({ label, sub: "", link: "", image });

test("brands are read with their logos, and a brand without a logo keeps its name", () => {
  const got = brandsOf([brand("Minimalist", LOGO), brand("Plum")]);
  assert.equal(got?.items.length, 2);
  assert.deepEqual(got?.items.map((i) => i.label), ["Minimalist", "Plum"]);
  assert.equal(got?.items[0].image, LOGO);
  assert.equal(got?.items[1].image, "");
});

test("more than 12 brands keeps the first 12, in the admin's order", () => {
  const thirteen = Array.from({ length: 13 }, (_, i) => brand(`Brand ${i + 1}`));
  const got = brandsOf(thirteen);
  assert.equal(got?.items.length, 12);
  assert.equal(got?.items[0].label, "Brand 1");
  assert.equal(got?.items[11].label, "Brand 12");
});

test("empty and blank brand names are dropped, and do not take a place in the 12", () => {
  const items = [brand(""), brand("   "), brand("Acme"), ...Array.from({ length: 12 }, (_, i) => brand(`B${i}`))];
  const got = brandsOf(items);
  assert.equal(got?.items.length, 12);
  assert.equal(got?.items[0].label, "Acme");
  assert.ok(got?.items.every((i) => i.label.trim() !== ""));
});

test("an empty brand list gives no override, so the built-in strip shows", () => {
  assert.equal(brandsOf([]), undefined);
  assert.equal(brandsOf([brand(""), brand("  ")]), undefined);
  assert.equal(readBlockSettings({ blocks: [{ id: "brands", enabled: true, position: 0 }] })["brands"], undefined);
});

test("a bad logo on a brand keeps the brand by name, without a logo", () => {
  const got = brandsOf([brand("Acme", "https://example.com/logo.png")]);
  assert.equal(got?.items.length, 1);
  assert.equal(got?.items[0].image, "");
});
