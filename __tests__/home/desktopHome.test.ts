import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP_MIN_WIDTH, DESKTOP_MEDIA_QUERY, forcedHomeDevice, homeLayoutUrl, pickHomeDevice } from "../../glowvai-app/features/shop/lib/homeDevice";
import { DEFAULT_BLOCK_ORDER, EMPTY_FOOTER_DETAILS, readLayoutResponse } from "../../glowvai-app/features/shop/lib/useHomeLayout";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const desktopSource = read("glowvai-app/features/shop/screens/ShopDesktopHome.tsx");
const homeSource = read("glowvai-app/features/shop/screens/ShopHomeScreen.tsx");
const desktopCss = read("glowvai-app/features/shop/styles/shop-desktop-home.css");

const BLOCK_IDS = ["hero", "mini-banners", "offers", "categories", "promos", "deals", "reorder", "product-rails", "brands", "trust", "help-gift", "footer"];

describe("which home the website shows", () => {
  test("1024px and wider is desktop, narrower is mobile", () => {
    assert.equal(DESKTOP_MIN_WIDTH, 1024);
    assert.equal(DESKTOP_MEDIA_QUERY, "(min-width: 1024px)");
    assert.equal(pickHomeDevice(null, true), "desktop");
    assert.equal(pickHomeDevice(null, false), "mobile");
  });

  test("?device= forces the choice whatever the width", () => {
    assert.equal(pickHomeDevice(forcedHomeDevice("?device=desktop"), false), "desktop");
    assert.equal(pickHomeDevice(forcedHomeDevice("?device=mobile"), true), "mobile");
    assert.equal(forcedHomeDevice("?preview=abc&device=desktop"), "desktop");
  });

  test("any other device value forces nothing", () => {
    for (const search of ["", "?", "?device=", "?device=Desktop", "?device=tablet", "?device=desktop%20", "?devices=desktop"]) {
      assert.equal(forcedHomeDevice(search), null, search);
    }
  });
});

describe("the layout request", () => {
  test("mobile asks exactly what it asked before (no device parameter)", () => {
    assert.equal(homeLayoutUrl("mobile", null), "/api/shop/layout");
    assert.equal(homeLayoutUrl("mobile", "tok.en"), "/api/shop/layout?preview=tok.en");
  });

  test("desktop adds device=desktop, with the preview token when there is one", () => {
    assert.equal(homeLayoutUrl("desktop", null), "/api/shop/layout?device=desktop");
    assert.equal(homeLayoutUrl("desktop", "a b&c"), "/api/shop/layout?preview=a%20b%26c&device=desktop");
  });

  test("the reply is read field by field; bad fields keep the built-in values", () => {
    const got = readLayoutResponse({ ok: true, blocks: ["deals", "footer"], settings: "x", rows: null, hero: 3, footer: { companyLine: "Co" }, preview: true, device: "desktop", fallback: true });
    assert.deepEqual(got.order, ["deals", "footer"]);
    assert.deepEqual(got.settings, {});
    assert.deepEqual(got.rows, []);
    assert.equal(got.hero, null);
    assert.deepEqual(got.footer, { ...EMPTY_FOOTER_DETAILS, companyLine: "Co" });
    assert.equal(got.preview, true);
    assert.equal(got.fallback, true);
    const empty = readLayoutResponse(null);
    assert.deepEqual(empty.order, DEFAULT_BLOCK_ORDER);
    assert.equal(empty.preview, false);
    assert.equal(empty.fallback, false);
  });
});

describe("the desktop home", () => {
  test("renders the desktop layout, in the admin's order, with all 12 blocks", () => {
    assert.match(desktopSource, /useHomeLayout\('desktop'\)/);
    assert.ok(desktopSource.includes("layoutOrder.filter((id) => id !== 'footer').map("));
    for (const id of BLOCK_IDS) assert.match(desktopSource, new RegExp("case '" + id + "':"), "block " + id + " is missing");
    assert.ok(desktopSource.indexOf("{pinnedTail}") < desktopSource.indexOf("{renderBlock('footer')}"));
  });

  test("has the wide header: logo, delivery, search, login or account, cart, and the category tabs", () => {
    for (const marker of ['className="shop-desk-logo"', 'className="shop-desk-delivery"', 'className="shop-desk-search"', "'Account' : 'Login'", 'className="shop-desk-cart"', 'className="shop-desk-tabs"']) {
      assert.ok(desktopSource.includes(marker), marker);
    }
  });

  test("keeps the honest empty and loading states and the staff preview notice", () => {
    assert.match(desktopSource, /No discounted products right now\./);
    assert.match(desktopSource, /No products are listed yet/);
    assert.match(desktopSource, /Products could not be loaded/);
    assert.match(desktopSource, /Loading products/);
    assert.match(desktopSource, /<HomeBanners \/>/);
    assert.match(desktopSource, /layout\.preview &&/);
    assert.match(desktopSource, /<SkinQuizBanner \/>/);
  });

  test("the shop home picks desktop or mobile, and the home inside the skin report stays mobile", () => {
    assert.match(homeSource, /const device = useHomeDevice\(\);/);
    assert.match(homeSource, /if \(device === 'desktop' && !embedded\) return <ShopDesktopHome \/>;/);
    assert.match(homeSource, /useHomeLayout\('mobile'\)/);
  });

  test("hides the shell header and the phone tab bar only while the desktop home is shown", () => {
    assert.match(desktopCss, /\.app-viewport:has\(\.shop-desk\) \.web-header/);
    assert.match(desktopCss, /\.app-viewport:has\(\.shop-desk\) \.bottom-commerce-shell/);
  });
});

describe("desktop rows fill evenly", () => {
  test("balancedColumns spreads tiles over even rows", async () => {
    const { balancedColumns } = await import("../../glowvai-app/features/shop/lib/homeDevice");
    assert.equal(balancedColumns(6, 6), 6);
    assert.equal(balancedColumns(6, 8), 6);
    assert.equal(balancedColumns(10, 8), 5);
    assert.equal(balancedColumns(9, 8), 5);
    assert.equal(balancedColumns(12, 6), 6);
    assert.equal(balancedColumns(2, 3), 2);
    assert.equal(balancedColumns(4, 3), 2);
    assert.equal(balancedColumns(0, 6), 1);
  });
});

describe("desktop accents", () => {
  test("an item's own valid accent wins, otherwise the palette in order", async () => {
    const { ACCENT_PALETTE, effectiveAccent, isAccent } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.deepEqual(ACCENT_PALETTE.map((a) => a.hex), ["#8B5CF6", "#4F8EF7", "#F4A261", "#6BAF92", "#E85D8F", "#F26B5B", "#C8A96A", "#1F2A44"]);
    assert.equal(effectiveAccent("#12ab34", 0), "#12AB34");
    for (const bad of ["", "red", "#123", "#12345g", "123456", null, undefined, 5]) assert.equal(isAccent(bad), false, String(bad));
    assert.equal(effectiveAccent("", 0), "#8B5CF6");
    assert.equal(effectiveAccent("nope", 9), "#4F8EF7");
  });

  test("categories map by name first, then the palette", async () => {
    const { categoryAccent } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.equal(categoryAccent("Serums", null, 5), "#8B5CF6");
    assert.equal(categoryAccent("moisturizers", null, 0), "#4F8EF7");
    assert.equal(categoryAccent("Sunscreen", null, 0), "#F4A261");
    assert.equal(categoryAccent("Cleansers", null, 0), "#6BAF92");
    assert.equal(categoryAccent("Treatments", null, 0), "#E85D8F");
    assert.equal(categoryAccent("Coupons", null, 0), "#F26B5B");
    assert.equal(categoryAccent("Brands", null, 0), "#C8A96A");
    assert.equal(categoryAccent("Shop all", null, 0), "#1F2A44");
    assert.equal(categoryAccent("All Products", null, 0), "#1F2A44");
    assert.equal(categoryAccent("Serums", "#000000", 0), "#000000");
    assert.equal(categoryAccent("Lip care", null, 2), "#F4A261");
  });

  test("a section's accent falls back to its default; text on tints stays readable", async () => {
    const { sectionAccent, accentInk, contrast, textOn, mix, ACCENT_PALETTE } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.equal(sectionAccent({ accent: "#abcdef" }, "#000000"), "#ABCDEF");
    assert.equal(sectionAccent({ accent: "pink" }, "#000000"), "#000000");
    assert.equal(sectionAccent(undefined, "#000000"), "#000000");
    for (const { hex } of ACCENT_PALETTE) {
      const ink = accentInk(hex);
      assert.ok(contrast(ink, "#FBF8F5") >= 4.5, hex);
      assert.ok(contrast(ink, mix("#FBF8F5", hex, 0.16)) >= 4.5, hex);
      assert.ok(contrast(textOn(hex), hex) >= 3, hex);
    }
  });

  test("the desktop home uses the accents and keeps brand blue for the main buttons", () => {
    assert.match(desktopSource, /from '\.\.\/lib\/desktopAccents'/);
    assert.match(desktopCss, /var\(--acc-ink/);
    assert.match(desktopCss, /\.shop-desk-add\{[^}]*var\(--desk-brand\)/);
  });
});

describe("desktop motion respects reduced motion", () => {
  test("movement is switched off under prefers-reduced-motion", () => {
    assert.match(desktopCss, /@media \(prefers-reduced-motion: reduce\)\{[\s\S]*animation: none !important/);
    assert.match(desktopSource, /prefers-reduced-motion: reduce/);
  });
});
