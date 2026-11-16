import { test } from "node:test";
import assert from "node:assert/strict";
import { isPosterOnlyHero } from "../../glowvai-app/features/shop/lib/heroPoster";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("an image alone is a poster", () => {
  assert.equal(isPosterOnlyHero({ title: "", subtitle: "", ctaLabel: "", image: PNG }), true);
  assert.equal(isPosterOnlyHero({ image: PNG }), true);
});

test("any text or button keeps the normal hero", () => {
  assert.equal(isPosterOnlyHero({ image: PNG, title: "Hi" }), false);
  assert.equal(isPosterOnlyHero({ image: PNG, subtitle: "Hi" }), false);
  assert.equal(isPosterOnlyHero({ image: PNG, ctaLabel: "Go" }), false);
});

test("no image or no hero keeps the static fallback", () => {
  assert.equal(isPosterOnlyHero({ title: "", image: "" }), false);
  assert.equal(isPosterOnlyHero(null), false);
  assert.equal(isPosterOnlyHero(undefined), false);
});
