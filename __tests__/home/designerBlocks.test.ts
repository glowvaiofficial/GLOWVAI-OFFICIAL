import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readLayoutResponse, readHeaderSettings, readMaintenance, ITEM_BLOCK_IDS } from "../../glowvai-app/features/shop/lib/useHomeLayout";
import { BLOCK_MODULES, homeSequence, recommendedProducts, clampMaxItems } from "../../glowvai-app/features/shop/lib/homeModel";
import { maintenanceActive, backAtLabel } from "../../glowvai-app/features/shop/lib/maintenance";
import { hintText } from "../../glowvai-app/features/shop/shared/searchHints";
import type { SkincareProduct } from "../../glowvai-app/core/data/indianSkincareCatalog";

const p = (id: string, category: string, brand = "B", rating = 4): SkincareProduct =>
  ({ id, name: id, category, brand, price: 400, originalPrice: 500, volume: "50 ml", rating, reviewCount: 1, description: "", keyActives: [] }) as unknown as SkincareProduct;

describe("layout parsing of designer fields", () => {
  test("old responses still work", () => {
    const v = readLayoutResponse({ blocks: ["hero"], settings: {} });
    assert.deepEqual(v.header, { searchHints: [], deliveryModes: [], showDeliveryModes: false });
    assert.equal(v.maintenance.enabled, false);
  });
  test("new fields are read and cleaned", () => {
    const v = readLayoutResponse({
      blocks: ["stories"],
      settings: { stories: { title: "S", items: [{ label: "a", sub: "b", link: "/x", image: "", accent: "#123456" }, 5, { label: "c", accent: "red" }] }, recommended: { maxItems: 5 }, bad: 3 },
      headerSettings: { searchHints: ["serum", "", 4], deliveryModes: [{ label: "Quick", link: "/shop" }, { link: "x" }], showDeliveryModes: true },
      maintenance: { enabled: true, message: "Back soon", until: "2030-01-01T00:00:00Z" },
    });
    assert.equal(v.settings.stories?.items.length, 2);
    assert.equal(v.settings.stories?.items[0].accent, "#123456");
    assert.equal(v.settings.stories?.items[1].accent, undefined);
    assert.equal(v.settings.recommended?.maxItems, 5);
    assert.deepEqual(v.header.searchHints, ["serum"]);
    assert.equal(v.header.deliveryModes.length, 1);
    assert.equal(v.maintenance.until, Date.parse("2030-01-01T00:00:00Z"));
    assert.deepEqual(readHeaderSettings("x"), readHeaderSettings(null));
    assert.equal(readMaintenance({ enabled: "yes" }).enabled, false);
  });
});

describe("block order", () => {
  test("every designer block has a module and follows admin order", () => {
    for (const id of [...ITEM_BLOCK_IDS, "recently-viewed", "recommended"]) assert.ok(BLOCK_MODULES[id]);
    const seq = homeSequence(["stories", "hero", "sponsored"]);
    assert.ok(seq.indexOf("stories") < seq.indexOf("hero") && seq.indexOf("hero") < seq.indexOf("sponsored"));
  });
  test("the designer recently viewed block replaces the built-in rail", () => {
    assert.ok(!homeSequence(["reorder", "recently-viewed"]).includes("recent"));
    assert.ok(homeSequence(["reorder"]).includes("recent"));
  });
});

describe("recommended", () => {
  const cat = [p("a", "Serums"), p("b", "Serums", "B", 5), p("c", "Cleansers"), p("d", "Serums")];
  test("empty without history", () => assert.deepEqual(recommendedProducts(cat, [], [], 8), []));
  test("ranks by recent category, skips viewed, honours max", () => {
    const r = recommendedProducts(cat, ["a"], [], 8).map((x) => x.id);
    assert.deepEqual(r.slice(0, 2), ["b", "d"].sort((x, y) => (x === "b" ? -1 : 1)));
    assert.ok(!r.includes("a"));
    assert.equal(recommendedProducts(cat, ["a"], [], 1).length, 1);
    assert.equal(clampMaxItems(undefined), 8);
  });
});

describe("maintenance", () => {
  const now = 1_000_000;
  test("on when enabled and until is empty or future", () => {
    assert.equal(maintenanceActive({ enabled: true, message: "", until: null }, now, false), true);
    assert.equal(maintenanceActive({ enabled: true, message: "", until: now + 1 }, now, false), true);
    assert.equal(maintenanceActive({ enabled: true, message: "", until: now - 1 }, now, false), false);
    assert.equal(maintenanceActive({ enabled: false, message: "", until: null }, now, false), false);
  });
  test("never blocks a staff preview", () => assert.equal(maintenanceActive({ enabled: true, message: "", until: null }, now, true), false));
  test("back-at label", () => {
    assert.equal(backAtLabel(null, now), "");
    assert.match(backAtLabel(now + 3600_000, now), /^Back at /);
  });
});

describe("search hints", () => {
  test("admin hints complete Search for, unless they already say Search", () => {
    assert.equal(hintText("serum"), "Search for serum...");
    assert.equal(hintText("Search lip balm"), "Search lip balm");
  });
});
