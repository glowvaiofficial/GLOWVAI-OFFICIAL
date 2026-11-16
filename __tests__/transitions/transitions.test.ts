import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyTransition } from "../../glowvai-app/core/transitions";

describe("screen transitions", () => {
  test("direction and kind", () => {
    assert.equal(classifyTransition("shop-home", "shop-browse", "forward"), "tab");
    assert.equal(classifyTransition("shop-browse", "shop-category", "forward"), "forward");
    assert.equal(classifyTransition("shop-home", "shop-product", "forward", true), "product");
    assert.equal(classifyTransition("shop-home", "shop-product", "forward", false), "forward");
    assert.equal(classifyTransition("shop-product", "shop-home", "back"), "back");
    assert.equal(classifyTransition("shop-home", "location-setup", "forward"), "sheet");
    assert.equal(classifyTransition("location-setup", "shop-home", "back"), "sheet-back");
  });
  test("css never hides content and keeps reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "glowvai-app/features/shop/styles/v3-transitions.css"), "utf8");
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(css, /@property/);
  });
});
