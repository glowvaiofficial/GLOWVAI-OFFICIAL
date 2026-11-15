import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOME_BLOCK_IDS,
  MAINTENANCE_DEFAULT_MESSAGE,
  chooseLayoutSource,
  readBlockSettings,
  readHeaderSettings,
  readHomeLayout,
  readMaintenance,
  readSectionAccents,
} from "@/lib/shop/homeLayout";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const layoutRoute = readFileSync(join(root, "app/api/shop/layout/route.ts"), "utf8");
const homeRoute = readFileSync(join(root, "app/api/shop/home/route.ts"), "utf8");

const item = (label: string, extra: Record<string, unknown> = {}) => ({ label, sub: "", link: "/shop", image: "", ...extra });
const block = (id: string, items: unknown[], extra: Record<string, unknown> = {}, enabled = true) => ({
  id,
  enabled,
  position: 0,
  settings: { title: "", background: "", textColor: "", items, ...extra },
});

describe("new homepage blocks", () => {
  test("the block list and order", () => {
    assert.deepEqual([...HOME_BLOCK_IDS], [
      "hero", "festival-strip", "mini-banners", "offers", "bank-offers", "cashback", "categories", "promos", "deals", "sponsored",
      "reorder", "product-rails", "recommended", "recently-viewed", "brands", "partners", "trust", "stories", "help-gift", "footer",
    ]);
  });

  test("item limits: 6, 4, 3, 12, 8, 1", () => {
    const limits: [string, number][] = [["festival-strip", 6], ["bank-offers", 4], ["cashback", 3], ["partners", 12], ["stories", 8], ["sponsored", 1]];
    for (const [id, max] of limits) {
      const got = readBlockSettings({ blocks: [block(id, Array.from({ length: max + 3 }, (_, i) => item("N" + i)))] });
      assert.equal(got[id as keyof typeof got]?.items.length, max, id);
    }
  });

  test("empty item blocks are omitted; bad items are dropped before the limit", () => {
    assert.equal(readBlockSettings({ blocks: [block("stories", [])] }).stories, undefined);
    const got = readBlockSettings({ blocks: [block("sponsored", [item("", {}), item("Acme", { sub: "Presented by Acme", link: "//evil" }), item("Good", { sub: "Presented by Good" })])] });
    assert.equal(got.sponsored?.items.length, 1);
    assert.equal(got.sponsored?.items[0].label, "Good");
  });

  test("partners are logo-only: sub and link optional", () => {
    const got = readBlockSettings({ blocks: [block("partners", [{ label: "Acme", sub: "", link: "", image: "" }])] });
    assert.equal(got.partners?.items[0].label, "Acme");
  });

  test("data-driven blocks are listed when on, with defaults, and never carry items", () => {
    const got = readBlockSettings({ blocks: [{ id: "recommended", enabled: true, position: 0 }, block("recently-viewed", [item("x")], { maxItems: 6, accent: "#0ea5e9", title: "Seen" })] });
    assert.deepEqual(got.recommended, { title: "", background: "", textColor: "", items: [], maxItems: 8 });
    assert.equal(got["recently-viewed"]?.maxItems, 6);
    assert.equal(got["recently-viewed"]?.items.length, 0);
    assert.equal(got["recently-viewed"]?.accent, "#0EA5E9");
    assert.equal(got["recently-viewed"]?.title, "Seen");
  });

  test("data-driven blocks: a bad maxItems falls back to 8; off blocks are not listed", () => {
    for (const bad of [3, 13, 5.5, "8", null]) {
      assert.equal(readBlockSettings({ blocks: [block("recommended", [], { maxItems: bad })] }).recommended?.maxItems, 8);
    }
    assert.equal(readBlockSettings({ blocks: [block("recommended", [], {}, false)] }).recommended, undefined);
    assert.equal(readBlockSettings({ blocks: [block("recommended", [], { maxItems: 12 })] }).recommended?.maxItems, 12);
  });

  test("section accents cover the new blocks; unknown ids are dropped", () => {
    const raw = { blocks: [block("cashback", [], { accent: "#14b8a6" }), block("recommended", [], { accent: "#C026D3" }), block("nope", [item("x")], { accent: "#111111" })] };
    assert.deepEqual(readSectionAccents(raw), { cashback: "#14B8A6", recommended: "#C026D3" });
    assert.equal((readBlockSettings(raw) as Record<string, unknown>).nope, undefined);
  });

  test("an older layout without the new blocks gets them on at their default places; old order holds", () => {
    const old = ["hero", "mini-banners", "offers", "categories", "promos", "deals", "reorder", "product-rails", "brands", "trust", "help-gift", "footer"];
    const order = readHomeLayout({ blocks: old.map((id, i) => ({ id, enabled: id !== "trust", position: i })) });
    assert.deepEqual(order, [
      "hero", "festival-strip", "mini-banners", "offers", "bank-offers", "cashback", "categories", "promos", "deals", "sponsored",
      "reorder", "product-rails", "recommended", "recently-viewed", "brands", "partners", "stories", "help-gift", "footer",
    ]);
    const custom = readHomeLayout({ blocks: [{ id: "offers", enabled: true, position: 0 }, { id: "hero", enabled: true, position: 1 }] });
    assert.deepEqual(custom.slice(0, 3), ["offers", "bank-offers", "cashback"]);
    assert.equal(custom[custom.indexOf("hero") + 1], "festival-strip");
    assert.equal(custom.at(-1), "footer");
  });
});

describe("header settings", () => {
  test("empty arrays when unset", () => {
    for (const raw of [undefined, null, {}, { headerSettings: null }, { headerSettings: "x" }, { headerSettings: [] }]) {
      assert.deepEqual(readHeaderSettings(raw), { searchHints: [], deliveryModes: [], showDeliveryModes: false });
    }
  });

  test("valid values pass; invalid entries are dropped; limits hold", () => {
    const got = readHeaderSettings({
      headerSettings: {
        searchHints: [" serum ", "", "x".repeat(41), 5, "<b>", ...Array.from({ length: 12 }, (_, i) => "h" + i)],
        deliveryModes: [
          { label: "Express", link: "/shop" },
          { label: "", link: "/shop" },
          { label: "Evil", link: "https://evil.com" },
          { label: "Proto", link: "//evil.com" },
          { label: "TooLongLabel-123456", link: "/a" },
          null,
          { label: "B", link: "/b" },
          { label: "C", link: "/c" },
          { label: "D", link: "/d" },
          { label: "E", link: "/e" },
        ],
        showDeliveryModes: true,
      },
    });
    assert.equal(got.searchHints[0], "serum");
    assert.equal(got.searchHints.length, 8);
    assert.deepEqual(got.deliveryModes.map((m) => m.label), ["Express", "B", "C", "D"]);
    assert.equal(got.showDeliveryModes, true);
    assert.equal(readHeaderSettings({ headerSettings: { showDeliveryModes: "yes" } }).showDeliveryModes, false);
  });

  test("they come from the mobile layout for both devices", () => {
    const mobile = { blocks: [], headerSettings: { searchHints: ["m"], deliveryModes: [], showDeliveryModes: false } };
    const doc = { published: mobile, desktop: { published: { blocks: [{ id: "hero", enabled: true, position: 0 }] } } };
    const choice = chooseLayoutSource(doc, "desktop", false);
    assert.equal(readHeaderSettings(choice.footerSource).searchHints[0], "m");
  });
});

describe("maintenance mode", () => {
  test("off when unset or invalid; never throws", () => {
    const off = { enabled: false, message: MAINTENANCE_DEFAULT_MESSAGE, until: null };
    for (const raw of [undefined, null, 5, {}, { maintenance: null }, { maintenance: "on" }, { maintenance: { enabled: "true" } }, { maintenance: { enabled: 1 } }]) {
      assert.deepEqual(readMaintenance(raw), off);
    }
  });

  test("on with message and until; bad parts fall back", () => {
    assert.deepEqual(readMaintenance({ maintenance: { enabled: true, message: " Back soon ", until: 1_800_000_000_000 } }), { enabled: true, message: "Back soon", until: 1_800_000_000_000 });
    assert.deepEqual(readMaintenance({ maintenance: { enabled: true } }), { enabled: true, message: MAINTENANCE_DEFAULT_MESSAGE, until: null });
    assert.equal(readMaintenance({ maintenance: { enabled: true, message: "x".repeat(141) } }).message, MAINTENANCE_DEFAULT_MESSAGE);
    assert.equal(readMaintenance({ maintenance: { enabled: true, until: "soon" } }).until, null);
    assert.equal(readMaintenance({ maintenance: { enabled: true, until: -1 } }).until, null);
  });

  test("both routes serve it and keep the short cache", () => {
    assert.match(layoutRoute, /readMaintenance\(data\)/);
    assert.match(layoutRoute, /headerSettings, maintenance/);
    assert.match(layoutRoute, /s-maxage=60/);
    assert.match(homeRoute, /maintenance/);
    assert.match(homeRoute, /s-maxage=60/);
  });
});
