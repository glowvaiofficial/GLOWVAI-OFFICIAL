import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOME_CATEGORY_TILES,
  HOME_FOOTER_GROUPS,
  categoryTiles,
  configuredSocials,
  BLOCK_MODULES,
  PRICE_POINTS,
  bestsellerList,
  dedupeRails,
  homeSequence,
  newLaunchList,
  pricePointTiles,
  type FooterLink,
} from "../../glowvai-app/features/shop/lib/homeModel";
import { DEFAULT_BLOCK_ORDER, readLayoutResponse } from "../../glowvai-app/features/shop/lib/useHomeLayout";
import type { SkincareProduct } from "../../glowvai-app/core/data/indianSkincareCatalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const homeSource = readFileSync(
  join(root, "glowvai-app/features/shop/screens/ShopHomeScreen.tsx"),
  "utf8",
);

// A catalogue product with only the fields the home reads. Fields the home does not read are left out on purpose.
const product = (
  id: string,
  category: SkincareProduct["category"],
  extra: Partial<SkincareProduct> = {},
): SkincareProduct =>
  ({
    id,
    brand: "Brand",
    name: `Product ${id}`,
    category,
    price: 400,
    originalPrice: 500,
    volume: "50 ml",
    rating: null,
    reviewCount: null,
    imageSource: null,
    cardBg: "#fff",
    description: "",
    keyActives: [],
    metrics: { hydration: "", glow: "", barrier: "" },
    deliveryMinutes: null,
    ...extra,
  }) as unknown as SkincareProduct;

describe("home section order", () => {
  // Each marker is a string that only appears where that section is rendered.
  const order: [string, string][] = [
    ["header with concern tabs", "<MobileHomeHeader"],
    ["skin quiz banner", "<SkinQuizBanner />"],
    ["greeting card", "<GreetingCard"],
    ["hero", "<HeroCarousel"],
    ["categories", 'aria-labelledby="shop-home-categories-title"'],
    ["offers", "<PromosBlock"],
    ["deals", 'aria-labelledby="shop-home-deals-title"'],
    ["price points", "<PricePoints"],
    ["bestsellers", 'title="Bestsellers"'],
    ["concerns", "<ConcernGrid"],
    ["face scan", 'aria-labelledby="shop-home-scan-title"'],
    ["end card", 'className="shop-home-end"'],
    ["footer", "<footer"],
  ];

  test("the blocks are rendered from the published layout, in its order", () => {
    // The page renders each block by its id, in the order the admin layout gives (useHomeLayout). The header and the
    // skin quiz strip stay at the top; the skin scan and closing card sit after the blocks; the footer is last.
    const pinnedTop = ["header with concern tabs", "skin quiz banner", "greeting card"];
    let last = -1;
    for (const [name, marker] of pinnedTop.map((n) => order.find(([k]) => k === n)!)) {
      const at = homeSource.indexOf(marker);
      assert.notEqual(at, -1, name + " is missing");
      assert.ok(at > last, name + " must be in the header area, in order");
      last = at;
    }
    assert.ok(homeSource.includes("homeSequence(layoutOrder).filter((id) => id !== 'footer').map("));
    for (const id of ["hero", "mini-banners", "offers", "categories", "promos", "deals", "reorder", "product-rails", "brands", "trust", "help-gift", "footer", "price-points", "bestsellers", "new-launches", "concerns", "recent", "scan"]) {
      assert.match(homeSource, new RegExp("case '" + id + "':"), "block " + id + " is missing");
    }
    assert.ok(homeSource.indexOf("const pinnedTail") < homeSource.indexOf("{pinnedTail}"));
    assert.ok(homeSource.includes("const scanCard") && homeSource.includes("return scanCard;"));
    assert.ok(homeSource.includes("{pinnedTail}") && homeSource.includes("{renderBlock('footer')}"));
  });

  test("each section has an honest empty or loading state, not a blank one", () => {
    assert.match(homeSource, /No discounted products right now\./);
    assert.match(homeSource, /No products are listed yet/);
    assert.match(homeSource, /Products could not be loaded/);
    assert.match(homeSource, /Loading products/);
  });

  test("no product is shown twice across the product rails", () => {
    const rails = dedupeRails([
      { id: "a", title: "A", products: [product("1", "Serums"), product("2", "Serums")], limit: 6 },
      { id: "b", title: "B", products: [product("2", "Serums"), product("3", "Serums")], limit: 6 },
    ]);
    const ids = rails.flatMap((r) => r.products.map((p) => p.id));
    assert.deepEqual(ids, ["1", "2", "3"]);
    assert.deepEqual(
      rails.map((r) => r.id),
      ["a", "b"],
    );
  });

  test("a rail with nothing left to show is dropped, not rendered empty", () => {
    const rails = dedupeRails([
      { id: "a", title: "A", products: [product("1", "Serums")], limit: 6 },
      { id: "b", title: "B", products: [product("1", "Serums")], limit: 6 },
    ]);
    assert.deepEqual(rails.map((r) => r.id), ["a"]);
  });

  test("a rail never goes past its limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => product(`p${i}`, "Serums"));
    const [rail] = dedupeRails([{ id: "a", title: "A", products: many, limit: 6 }]);
    assert.equal(rail.products.length, 6);
  });
});

describe("category tiles", () => {
  const catalog = [
    product("s1", "Serums"),
    product("s2", "Serums"),
    product("s3", "Serums", { name: "Serum trial pack" }),
    product("m1", "Moisturizers"),
    product("c1", "Cleansers", { name: "Travel sample cleanser" }),
    product("c2", "Cleansers"),
  ];

  test("counts every catalogue product in the category, as the category screen lists them", () => {
    const tiles = categoryTiles(catalog);
    const count = Object.fromEntries(tiles.map((t) => [t.id, t.count]));
    assert.equal(count.Serums, 3);
    assert.equal(count.Moisturizers, 1);
    assert.equal(count.Cleansers, 2);
    assert.equal(count.Suncare, 0);
    assert.equal(count.Treatments, 0);
  });

  test("the counts add up to the catalogue for the five home categories", () => {
    const total = categoryTiles(catalog).reduce((n, t) => n + t.count, 0);
    assert.equal(total, catalog.length);
  });

  test("the tile photo comes from a full-size product when there is one", () => {
    const tiles = categoryTiles(catalog);
    assert.equal(tiles.find((t) => t.id === "Serums")?.sample?.id, "s1");
    assert.equal(tiles.find((t) => t.id === "Cleansers")?.sample?.id, "c2");
  });

  test("an empty category has no photo and a count of zero", () => {
    const tile = categoryTiles([]).find((t) => t.id === "Suncare");
    assert.equal(tile?.count, 0);
    assert.equal(tile?.sample, null);
  });

  test("every home category id is listed once", () => {
    const ids = HOME_CATEGORY_TILES.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, 5);
  });
});

// Emoji live in the pictographic blocks; the copyright sign is not an emoji and is allowed.
const EMOJI_RE = /[🀀-🫿☀-➿]/u;

describe("footer links", () => {
  // The footer links on origin/main (glowvai-app/features/shop/screens/ShopHomeScreen.tsx, FOOTER_LINKS and the legal row).
  const before: { label: string; target: string }[] = [
    { label: "Skin Care", target: "shop-browse" },
    { label: "Orders", target: "orders-list" },
    { label: "AI Skin Scan", target: "scan-camera" },
    { label: "Returns & Refunds", target: "profile-support" },
    { label: "Help & Support", target: "profile-support" },
    { label: "Privacy Policy", target: "/privacy" },
    { label: "Terms of Use", target: "/terms" },
  ];

  const links = HOME_FOOTER_GROUPS.flatMap((g) => g.links);
  const targetOf = (link: FooterLink) => ("href" in link ? link.href : link.screen);

  test("every footer link that existed before is still in the footer", () => {
    for (const old of before) {
      const found = links.find((l) => l.label === old.label);
      assert.ok(found, `missing footer link: ${old.label}`);
      assert.equal(targetOf(found), old.target, `${old.label} points somewhere else`);
    }
  });

  test("the footer has the four columns Shop, Help, Company and Legal, in that order", () => {
    assert.deepEqual(
      HOME_FOOTER_GROUPS.map((g) => g.title),
      ["Shop", "Help", "Company", "Legal"],
    );
  });

  test("footer labels have no emoji", () => {
    for (const link of links) {
      assert.doesNotMatch(link.label, EMOJI_RE, link.label);
    }
    const footerStart = homeSource.indexOf("<footer");
    assert.doesNotMatch(homeSource.slice(footerStart), EMOJI_RE);
  });
});

describe("social links", () => {
  test("only configured https addresses are shown, with their labels", () => {
    const socials = configuredSocials({
      instagram: "https://www.instagram.com/glowvai",
      twitter: "https://x.com/Glowvai",
      youtube: "",
      linkedin: "http://insecure.example",
    });
    assert.deepEqual(socials, [
      { label: "Instagram", url: "https://www.instagram.com/glowvai" },
      { label: "X", url: "https://x.com/Glowvai" },
    ]);
  });

  test("no social links when none are configured", () => {
    assert.deepEqual(configuredSocials({}), []);
  });
});

describe("home order (the designer's blocks set it)", () => {
  const SPEC = ["hero", "categories", "offers", "promos", "deals", "product-rails", "brands", "mini-banners", "reorder", "help-gift", "trust", "footer"];

  test("default order (no saved blocks) is the spec order, with anchored modules after their block", () => {
    assert.deepEqual(DEFAULT_BLOCK_ORDER, SPEC);
    assert.deepEqual(readLayoutResponse({}).order, SPEC);
    assert.deepEqual(homeSequence(DEFAULT_BLOCK_ORDER), ["hero", "categories", "offers", "promos", "deals", "price-points", "bestsellers", "new-launches", "product-rails", "concerns", "brands", "mini-banners", "reorder", "recent", "help-gift", "trust", "scan", "footer"]);
  });

  test("modules follow the order of the blocks the layout returns", () => {
    const seq = homeSequence(["trust", "hero", "deals", "categories", "footer"]);
    assert.deepEqual(seq, ["trust", "hero", "deals", "price-points", "categories", "scan", "footer"]);
    assert.deepEqual(readLayoutResponse({ blocks: ["trust", "hero"] }).order, ["trust", "hero"]);
  });

  test("a block the layout turns off hides its modules", () => {
    const seq = homeSequence(["hero", "categories", "footer"]);
    for (const id of ["offers", "deals", "price-points", "bestsellers", "new-launches", "product-rails", "concerns", "reorder", "recent", "brands"]) assert.ok(!seq.includes(id as never), id);
  });

  test("anchored modules move with their block", () => {
    assert.deepEqual(homeSequence(["product-rails", "deals"]).slice(0, 6), ["bestsellers", "new-launches", "product-rails", "concerns", "deals", "price-points"]);
    assert.deepEqual(homeSequence(["reorder", "brands"]).slice(0, 3), ["reorder", "recent", "brands"]);
  });

  test("the scan card shows before the footer, or last without a footer block; unknown blocks draw nothing", () => {
    assert.deepEqual(homeSequence(["footer", "hero"]), ["scan", "footer", "hero"]);
    assert.deepEqual(homeSequence(["hero", "festival-strip"]), ["hero", "scan"]);
    assert.ok(Object.keys(BLOCK_MODULES).includes("deals"));
  });

  test("the phone and PC homes both render from homeSequence", () => {
    const desktop = readFileSync(join(root, "glowvai-app/features/shop/screens/ShopDesktopHome.tsx"), "utf8");
    assert.ok(desktop.includes("homeSequence(layoutOrder)"));
    assert.ok(homeSource.includes("homeSequence(layoutOrder)"));
  });
});

describe("price points, bestsellers and new launches", () => {
  const catalog = [
    product("a", "Serums", { price: 199, rating: 4.1 }),
    product("b", "Serums", { price: 450, rating: 4.8 }),
    product("c", "Cleansers", { price: 700, rating: 4.5 }),
    product("d", "Cleansers", { price: 1500, rating: 3.9 }),
    product("t", "Serums", { price: 99, name: "Serum trial pack", rating: 5 }),
  ];

  test("the price points are 299, 499 and 999", () => {
    assert.deepEqual([...PRICE_POINTS], [299, 499, 999]);
  });

  test("each tile counts the full-size products under its price; trial packs are left out", () => {
    const tiles = pricePointTiles(catalog);
    assert.deepEqual(tiles.map((t) => [t.label, t.count]), [["Under ₹299", 1], ["Under ₹499", 2], ["Under ₹999", 3]]);
    assert.equal(tiles[1].sample?.id, "b");
  });

  test("a price point with no product under it has no tile", () => {
    assert.deepEqual(pricePointTiles([product("x", "Serums", { price: 1500 })]), []);
    assert.deepEqual(pricePointTiles([]), []);
  });

  test("bestsellers are best rated first, new launches newest first, both without trial packs", () => {
    assert.deepEqual(bestsellerList(catalog).map((p) => p.id), ["b", "c", "a", "d"]);
    assert.deepEqual(newLaunchList(catalog).map((p) => p.id), ["d", "c", "b", "a"]);
  });
});

describe("old-version leftovers are gone", () => {
  const css = readFileSync(join(root, "glowvai-app/features/shop/styles/shop-home.css"), "utf8");
  const desktopCss = readFileSync(join(root, "glowvai-app/features/shop/styles/shop-desktop-home.css"), "utf8");
  const desktop = readFileSync(join(root, "glowvai-app/features/shop/screens/ShopDesktopHome.tsx"), "utf8");

  test("no For Her / For Him mode on the homes", () => {
    for (const text of [homeSource, desktop, css, desktopCss]) assert.doesNotMatch(text, /zq-mode|shop-home-festival|Women<|Men<|For Her|For Him/);
  });

  test("no emoji in the home sources", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;
    const parts = readFileSync(join(root, "glowvai-app/features/shop/mobile/MobileHomeParts.tsx"), "utf8");
    for (const text of [homeSource, desktop, parts]) assert.doesNotMatch(text, emoji);
  });

  test("the real logo is used, not the typed wordmark or the old mark", () => {
    const parts = readFileSync(join(root, "glowvai-app/features/shop/mobile/MobileHomeParts.tsx"), "utf8");
    for (const text of [homeSource, desktop, parts]) assert.doesNotMatch(text, /glowvai-logo\.svg/);
    assert.match(parts, /<BrandLogo/);
    assert.match(desktop, /<BrandLogo/);
    const brand = readFileSync(join(root, "glowvai-app/shared/BrandLogo.tsx"), "utf8");
    assert.match(brand, /\/brand\/glowvai-wordmark-white\.png/);
    assert.match(brand, /\/brand\/glowvai-wordmark\.png/);
  });
});
