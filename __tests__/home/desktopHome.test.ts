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
