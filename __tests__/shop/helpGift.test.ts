import { test } from "node:test";
import assert from "node:assert/strict";
import { readBlockSettings } from "@/lib/shop/homeLayout";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const helpGift = (items: unknown[]) =>
  readBlockSettings({ blocks: [{ id: "help-gift", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items } }] })["help-gift"];
const card = (label: string, link: string, extra: Record<string, unknown> = {}) => ({ label, sub: "Line " + label, link, image: "", ...extra });

test("help cards read with their picture, title, line and link", () => {
  const got = helpGift([card("Need help?", "/contact", { image: PNG }), card("Gift cards", "/gift-cards")]);
  assert.equal(got?.items.length, 2);
  assert.equal(got?.items[0].label, "Need help?");
  assert.equal(got?.items[0].sub, "Line Need help?");
  assert.equal(got?.items[0].link, "/contact");
  assert.equal(got?.items[0].image, PNG);
  assert.equal(got?.items[1].image, "");
});

test("more than 3 help cards keeps the first 3", () => {
  const got = helpGift([card("A", "/a"), card("B", "/b"), card("C", "/c"), card("D", "/d")]);
  assert.deepEqual(got?.items.map((i) => i.label), ["A", "B", "C"]);
});

test("a card with a bad link is dropped and the others stay", () => {
  for (const link of ["//evil.example", "https://example.com", "/gift cards", "\help"]) {
    const got = helpGift([card("Bad", link), card("Good", "/gift-cards")]);
    assert.deepEqual(got?.items.map((i) => i.label), ["Good"], `link "${link}" should drop the card`);
  }
});

test("a card with no link opens the support page", () => {
  const got = helpGift([card("Refer and earn", "")]);
  assert.equal(got?.items[0].link, "/contact");
});

test("an empty list gives no override, so the built-in cards show", () => {
  assert.equal(helpGift([]), undefined);
  assert.equal(readBlockSettings({ blocks: [{ id: "help-gift", enabled: true, position: 0, settings: { items: [] } }] })["help-gift"], undefined);
});

test("a bad picture is dropped but the card stays", () => {
  const got = helpGift([card("Gift", "/gift-cards", { image: "data:image/svg+xml;base64,PHN2Zz4=" })]);
  assert.equal(got?.items.length, 1);
  assert.equal(got?.items[0].image, "");
});
