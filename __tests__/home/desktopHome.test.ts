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

const BLOCK_IDS = ["hero", "mini-banners", "offers", "categories", "promos", "deals", "reorder", "product-rails", "brands", "trust", "help-gift", "footer", "price-points", "bestsellers", "new-launches", "concerns", "recent", "scan"];

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
  test("renders the desktop layout in the spec order, with every block and module", () => {
    assert.match(desktopSource, /useHomeLayout\('desktop'\)/);
    assert.ok(desktopSource.includes("homeSequence(layoutOrder).filter((id) => id !== 'footer').map("));
    for (const id of BLOCK_IDS) assert.match(desktopSource, new RegExp("case '" + id + "':"), "block " + id + " is missing");
    assert.ok(desktopSource.indexOf("{pinnedTail}") < desktopSource.indexOf("{renderBlock('footer')}"));
  });

  test("has the wide header: logo, delivery, search, scan, orders, login or account, cart, and the category tabs", () => {
    for (const marker of ['className="shop-desk-logo"', 'className="shop-desk-delivery"', 'className="shop-desk-search"', "'Account' : 'Login'", 'className="shop-desk-cart"', 'className="shop-desk-tabs"', 'className="shop-desk-scan-pill"', "navigate('orders-list')"]) {
      assert.ok(desktopSource.includes(marker), marker);
    }
  });

  test("keeps the honest empty and loading states and the staff preview notice", () => {
    assert.match(desktopSource, /No discounted products right now\./);
    assert.match(desktopSource, /No products are listed yet/);
    assert.match(desktopSource, /Products could not be loaded/);
    assert.match(desktopSource, /Loading products/);
    // The admin banners join the hero carousel (the same /api/shop/home list the phone home shows).
    assert.match(desktopSource, /\/api\/shop\/home/);
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
    assert.deepEqual(ACCENT_PALETTE.map((a) => a.hex), ["#7C3AED", "#0EA5E9", "#14B8A6", "#84CC16", "#F43F5E", "#C026D3", "#4F46E5", "#1E293B"]);
    assert.equal(effectiveAccent("#12ab34", 0), "#12AB34");
    for (const bad of ["", "red", "#123", "#12345g", "123456", null, undefined, 5]) assert.equal(isAccent(bad), false, String(bad));
    assert.equal(effectiveAccent("", 0), "#7C3AED");
    assert.equal(effectiveAccent("nope", 9), "#0EA5E9");
  });

  test("categories map by name first, then the palette", async () => {
    const { categoryAccent } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.equal(categoryAccent("Serums", null, 5), "#7C3AED");
    assert.equal(categoryAccent("moisturizers", null, 0), "#0EA5E9");
    assert.equal(categoryAccent("Sunscreen", null, 0), "#14B8A6");
    assert.equal(categoryAccent("Cleansers", null, 0), "#84CC16");
    assert.equal(categoryAccent("Treatments", null, 0), "#F43F5E");
    assert.equal(categoryAccent("Coupons", null, 0), "#C026D3");
    assert.equal(categoryAccent("Brands", null, 0), "#4F46E5");
    assert.equal(categoryAccent("Shop all", null, 0), "#1E293B");
    assert.equal(categoryAccent("All", null, 0), "#1E293B");
    assert.equal(categoryAccent("Serums", "#000000", 0), "#000000");
    assert.equal(categoryAccent("Lip care", null, 2), "#14B8A6");
  });

  test("a section's accent falls back to its default; text on tints stays readable", async () => {
    const { sectionAccent, accentInk, contrast, textOn, mix, ACCENT_PALETTE } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.equal(sectionAccent({ accent: "#abcdef" }, "#000000"), "#ABCDEF");
    assert.equal(sectionAccent({ accent: "pink" }, "#000000"), "#000000");
    assert.equal(sectionAccent(undefined, "#000000"), "#000000");
    for (const { hex } of ACCENT_PALETTE) {
      const ink = accentInk(hex);
      assert.ok(contrast(ink, "#F5F7FD") >= 4.5, hex);
      assert.ok(contrast(ink, "#FFFFFF") >= 4.5, hex);
      assert.ok(contrast(ink, mix("#F5F7FD", hex, 0.16)) >= 4.5, hex);
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

describe("desktop layout follows the home design", () => {
  test("header tabs, greeting, chips, flash deals and the help banner are there", () => {
    for (const marker of ['className="shop-desk-greet"', "Track Order", "All categories", "/api/shop/flash-sales", "Ends in", 'className="shop-desk-plus"', "aria-roledescription=\"carousel\""]) {
      assert.ok(desktopSource.includes(marker), marker);
    }
  });

  test("the layout reply's section accents are read, keeping only #RRGGBB", () => {
    const got = readLayoutResponse({ sectionAccents: { deals: "#112233", hero: "red", brands: "#abc", promos: "#A1b2C3" } });
    assert.deepEqual(got.sectionAccents, { deals: "#112233", promos: "#A1b2C3" });
    assert.deepEqual(readLayoutResponse({ sectionAccents: ["#112233"] }).sectionAccents, {});
    assert.deepEqual(readLayoutResponse(null).sectionAccents, {});
  });

  test("a block's accent: its settings, then sectionAccents, then the default; deep shades carry white text", async () => {
    const { blockAccent, accentDeep, contrast, ACCENT_PALETTE } = await import("../../glowvai-app/features/shop/lib/desktopAccents");
    assert.equal(blockAccent({ accent: "#010203" }, { deals: "#0A0B0C" }, "deals", "#FFFFFF"), "#010203");
    assert.equal(blockAccent({ items: [] }, { deals: "#0a0b0c" }, "deals", "#FFFFFF"), "#0A0B0C");
    assert.equal(blockAccent(undefined, { deals: "nope" }, "deals", "#FFFFFF"), "#FFFFFF");
    assert.equal(blockAccent(undefined, undefined, "deals", "#FFFFFF"), "#FFFFFF");
    for (const { hex } of ACCENT_PALETTE) assert.ok(contrast("#FFFFFF", accentDeep(hex)) >= 4.5, hex);
  });
});

describe("scroll reveal never leaves the page blank", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../glowvai-app/features/shop/screens/ShopDesktopHome.tsx"), "utf8");
  test("sections are only hidden after the visitor scrolls, and shown for print", () => {
    assert.match(src, /let armed = false/);
    assert.match(src, /if \(!armed\) return;/);
    assert.match(src, /'wheel', 'touchmove', 'keydown', 'scroll'/);
    assert.match(src, /beforeprint/);
  });
});
