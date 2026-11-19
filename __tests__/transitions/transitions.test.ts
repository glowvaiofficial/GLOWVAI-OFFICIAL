import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyTransition, isAccountSectionSwitch, registerAccountScreens } from "../../glowvai-app/core/transitions";

describe("screen transitions", () => {
  test("switching Account sections on a wide screen has no transition", () => {
    const menu = new Set(["orders-list", "notifications-list", "profile-settings", "profile-support"]);
    registerAccountScreens((screen) => menu.has(screen));
    assert.equal(isAccountSectionSwitch("orders-list", "notifications-list", true), true);
    assert.equal(isAccountSectionSwitch("profile-settings", "profile-support", true), true);
    assert.equal(isAccountSectionSwitch("orders-list", "notifications-list", false), false);
    assert.equal(isAccountSectionSwitch("shop-home", "orders-list", true), false);
    assert.equal(isAccountSectionSwitch("orders-list", "shop-home", true), false);
  });

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
