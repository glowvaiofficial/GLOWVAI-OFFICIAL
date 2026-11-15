// Accent colours on the home items and sections: the palette and helpers, and that the layout parsing keeps a valid
// accent on items, block settings and the hero (both devices), and drops anything else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENT, CATEGORY_ACCENTS, GLOWVAI_ACCENTS, accentFor, accentForName, accentName, defaultSectionAccent, isAccent, paletteAccent, readAccent } from "@/lib/shop/accents";
import { chooseLayoutSource, readBlockSettings, readHeroOverride, readSectionAccents } from "@/lib/shop/homeLayout";

const routeSource = readFileSync(join(process.cwd(), "app/api/shop/layout/route.ts"), "utf8");
const item = (label: string, extra: Record<string, unknown> = {}) => ({ label, sub: "", link: "/shop", image: "", ...extra });
const blockOf = (id: string, settings: Record<string, unknown>) => ({ id, enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items: [], ...settings } });
const layout = (...blocks: unknown[]) => ({ blocks });

// ---- The palette module ----

test("the palette is the eight GlowVai accents in order", () => {
  assert.deepEqual([...GLOWVAI_ACCENTS], ["#7C3AED", "#0EA5E9", "#14B8A6", "#84CC16", "#F43F5E", "#C026D3", "#4F46E5", "#1E293B"]);
  assert.equal(accentName("#4F46E5"), "Indigo");
  assert.equal(accentName("#000000"), "");
});

test("category and section names map to their accent", () => {
  assert.equal(accentForName("Serums"), ACCENT.amethyst);
  assert.equal(accentForName("MOISTURIZERS"), ACCENT.sky);
  assert.equal(accentForName("sunscreen"), ACCENT.teal);
  assert.equal(accentForName("Cleansers"), ACCENT.lime);
  assert.equal(accentForName("Treatments"), ACCENT.rose);
  assert.equal(accentForName("Offers"), ACCENT.berry);
  assert.equal(accentForName("Coupons"), ACCENT.berry);
  assert.equal(accentForName("Brands"), ACCENT.indigo);
  assert.equal(accentForName("trust"), ACCENT.indigo);
  assert.equal(accentForName("All"), ACCENT.ink);
  assert.equal(accentForName(" Shop  all "), ACCENT.ink);
  assert.equal(accentForName("Hair"), "");
  assert.equal(accentForName(42), "");
  for (const v of Object.values(CATEGORY_ACCENTS)) assert.ok((GLOWVAI_ACCENTS as readonly string[]).includes(v));
});

test("only # and six hex digits is an accent, served upper case", () => {
  for (const good of ["#7C3AED", "#7C3AED", "#aBc123"]) assert.ok(isAccent(good), good);
  for (const bad of ["", "8B5CF6", "#8B5CF", "#7C3AED0", "#XYZXYZ", "#fff", " #7C3AED", "red", null, undefined, 123, {}]) assert.equal(isAccent(bad), false, String(bad));
  assert.equal(readAccent("#abcdef"), "#ABCDEF");
  assert.equal(readAccent("#abc"), "");
});

test("accentFor: the item's accent, else the category name, else the palette by place", () => {
  assert.equal(accentFor({ accent: "#123abc" }, 3, "Serums"), "#123ABC");
  assert.equal(accentFor({ accent: "" }, 3, "Serums"), ACCENT.amethyst);
  assert.equal(accentFor({ accent: "bad" }, 3, "Hair"), GLOWVAI_ACCENTS[3]);
  assert.equal(accentFor({}, 10), GLOWVAI_ACCENTS[2]);
  assert.equal(accentFor(undefined, 7), ACCENT.ink);
  assert.equal(accentFor(null, -1), ACCENT.amethyst);
  assert.equal(paletteAccent(8), GLOWVAI_ACCENTS[0]);
  assert.equal(paletteAccent(Number.NaN), GLOWVAI_ACCENTS[0]);
  assert.equal(defaultSectionAccent("brands"), ACCENT.indigo);
  assert.equal(defaultSectionAccent("mini-banners"), ACCENT.amethyst);
});

// ---- Layout parsing ----

const ITEM_BLOCKS = ["mini-banners", "offers", "categories", "promos", "brands", "trust", "help-gift"] as const;

test("every item block keeps a valid item accent and section accent, upper case", () => {
  for (const id of ITEM_BLOCKS) {
    const got = readBlockSettings(layout(blockOf(id, { accent: "#F43F5E", items: [item("One", { accent: "#0EA5E9" }), item("Two")] })))[id];
    assert.equal(got?.accent, "#F43F5E", id);
    assert.equal(got?.items[0].accent, "#0EA5E9", id);
    assert.equal("accent" in (got?.items[1] ?? {}), false, id);
  }
});

test("a bad accent is dropped alone: the item and the block stay, with the default", () => {
  for (const bad of ["", "#12345", "#1234567", "blue", "#GGGGGG", 7, null, { hex: "#7C3AED" }]) {
    const got = readBlockSettings(layout(blockOf("offers", { accent: bad, items: [item("Coupon", { accent: bad })] })))["offers"];
    assert.equal(got?.items.length, 1, String(bad));
    assert.equal("accent" in (got ?? {}), false, String(bad));
    assert.equal("accent" in (got?.items[0] ?? {}), false, String(bad));
  }
});

test("deals items keep a valid accent too", () => {
  const got = readBlockSettings(layout(blockOf("deals", { items: [{ label: "Serum", sub: "", link: "prod-1", accent: "#84CC16" }] })))["deals"];
  assert.equal(got?.items[0].accent, "#84CC16");
});

test("a block with no items is still left out of settings; its section accent is in readSectionAccents", () => {
  const raw = layout(
    blockOf("product-rails", { accent: "#0EA5E9" }),
    blockOf("categories", { accent: "#14B8A6" }),
    blockOf("offers", { accent: "nope", items: [item("Coupon")] }),
    blockOf("brands", { accent: "#4F46E5", items: [item("Acme")] }),
    { id: "hero", enabled: true, position: 0, settings: { accent: "#1E293B" } },
    { id: "made-up", enabled: true, position: 0, settings: { accent: "#123456" } },
  );
  const settings = readBlockSettings(raw);
  assert.equal(settings["product-rails"], undefined);
  assert.equal(settings["categories"], undefined);
  assert.deepEqual(readSectionAccents(raw), { "product-rails": "#0EA5E9", categories: "#14B8A6", brands: "#4F46E5", hero: "#1E293B" });
  assert.deepEqual(readSectionAccents(undefined), {});
  assert.deepEqual(readSectionAccents({ blocks: "x" }), {});
});

test("the hero keeps a valid accent from settings.hero, else the hero section accent; a bad one is dropped", () => {
  const hero = (settings: Record<string, unknown>) => readHeroOverride(layout({ id: "hero", enabled: true, position: 0, settings }));
  assert.equal(hero({ hero: { title: "Glow", accent: "#C026D3" } })?.accent, "#C026D3");
  assert.equal(hero({ accent: "#7C3AED", hero: { title: "Glow" } })?.accent, "#7C3AED");
  assert.equal(hero({ accent: "#7C3AED", hero: { title: "Glow", accent: "#0EA5E9" } })?.accent, "#0EA5E9");
  assert.equal(hero({ accent: "#7C3AED", hero: { title: "Glow", accent: "bad" } })?.accent, "#7C3AED");
  const dropped = hero({ hero: { title: "Glow", accent: "#12" } });
  assert.equal(dropped?.title, "Glow");
  assert.equal("accent" in (dropped ?? {}), false);
  // An accent alone is a hero setting: the text and picture stay built in.
  assert.deepEqual(hero({ hero: { title: "", accent: "#1E293B" } }), { title: "", subtitle: "", ctaLabel: "", ctaLink: "", image: "", accent: "#1E293B" });
  assert.equal(hero({ hero: { title: "", accent: "bad" } }), null);
});

test("Mobile and Desktop layouts carry accents the same way", () => {
  const mobile = layout(blockOf("trust", { accent: "#4F46E5", items: [item("Fast", { accent: "#84CC16" })] }));
  const desktop = layout(blockOf("trust", { accent: "#1E293B", items: [item("Fast", { accent: "#F43F5E" })] }));
  const doc = { published: mobile, draft: mobile, desktop: { published: desktop, draft: desktop } };
  for (const preview of [false, true]) {
    const m = readBlockSettings(chooseLayoutSource(doc, "mobile", preview).source)["trust"];
    assert.equal(m?.accent, "#4F46E5");
    assert.equal(m?.items[0].accent, "#84CC16");
    const d = readBlockSettings(chooseLayoutSource(doc, "desktop", preview).source)["trust"];
    assert.equal(d?.accent, "#1E293B");
    assert.equal(d?.items[0].accent, "#F43F5E");
  }
  // A desktop request with no desktop layout gets the mobile accents.
  const fallback = chooseLayoutSource({ published: mobile }, "desktop", false);
  assert.equal(fallback.fallback, true);
  assert.equal(readSectionAccents(fallback.source).trust, "#4F46E5");
});

test("the layout route serves the section accents, also on its error fallback", () => {
  assert.match(routeSource, /const sectionAccents = readSectionAccents\(source\);/);
  assert.match(routeSource, /footer, headerSettings, maintenance, sectionAccents, preview: isPreview, device, fallback \}/);
  assert.match(routeSource, /sectionAccents: \{\}, preview/);
});
