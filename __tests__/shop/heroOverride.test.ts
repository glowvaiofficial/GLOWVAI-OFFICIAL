import { test } from "node:test";
import assert from "node:assert/strict";
import { readHeroOverride } from "@/lib/shop/homeLayout";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const doc = (settings: Record<string, unknown>) => ({ blocks: [{ id: "hero", enabled: true, position: 0, settings }] });
const valid = { title: "New glow", subtitle: "Fresh picks daily", ctaLabel: "Browse", ctaLink: "/shop/sale", image: PNG };

test("a valid hero is kept", () => {
  assert.deepEqual(readHeroOverride(doc(valid)), valid);
});

test("each bad field is dropped on its own, the rest stay", () => {
  const cases: [string, unknown, string][] = [
    ["title", "x".repeat(81), ""],
    ["subtitle", "x".repeat(161), ""],
    ["ctaLabel", "x".repeat(31), ""],
    ["ctaLink", "//evil.example", ""],
    ["image", "data:image/svg+xml;base64,PHN2Zz4=", ""],
  ];
  for (const [field, bad, expected] of cases) {
    const got = readHeroOverride(doc({ ...valid, [field]: bad }));
    assert.ok(got, `${field}: the other fields should still give a hero`);
    assert.equal(got[field as keyof typeof got], expected, `${field} should be dropped`);
    for (const [other, value] of Object.entries(valid)) {
      if (other !== field) assert.equal(got[other as keyof typeof got], value, `${other} should be kept when ${field} is bad`);
    }
  }
});

test("an svg image is rejected", () => {
  assert.equal(readHeroOverride(doc({ title: "Hi", image: "data:image/svg+xml;base64,PHN2Zz4=" }))?.image, "");
});

test("an image over 200,000 characters is rejected", () => {
  const atLimit = "data:image/png;base64," + "A".repeat(200_000 - "data:image/png;base64,".length);
  assert.equal(readHeroOverride(doc({ title: "Hi", image: atLimit }))?.image, atLimit);
  assert.equal(readHeroOverride(doc({ title: "Hi", image: atLimit + "A" }))?.image, "");
});

test("a protocol-relative link is rejected", () => {
  assert.equal(readHeroOverride(doc({ title: "Hi", ctaLink: "//evil.example/x" }))?.ctaLink, "");
  assert.equal(readHeroOverride(doc({ ctaLink: "//evil.example/x" })), null);
  assert.equal(readHeroOverride(doc({ title: "Hi", ctaLink: "/\\evil" }))?.ctaLink, "");
});

test("an empty settings object gives null", () => {
  assert.equal(readHeroOverride(doc({})), null);
  assert.equal(readHeroOverride(doc({ title: "", subtitle: "", ctaLabel: "", ctaLink: "", image: "" })), null);
  assert.equal(readHeroOverride({}), null);
});

test("no hero block gives null", () => {
  assert.equal(readHeroOverride({ blocks: [{ id: "offers", enabled: true, position: 0, settings: valid }] }), null);
  assert.equal(readHeroOverride(undefined), null);
});
