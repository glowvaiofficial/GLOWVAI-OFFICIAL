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
  dedupeRails,
  type FooterLink,
} from "../../glowvai-app/features/shop/lib/homeModel";
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
    ["mode switch", 'aria-label="Shopping mode"'],
    ["skin quiz banner", "<SkinQuizBanner />"],
    ["hero", 'className="shop-home-showcase"'],
    ["festival", "shop-home-festival"],
    ["categories", 'aria-labelledby="shop-home-categories-title"'],
    ["offers", 'aria-label="Offers"'],
    ["deals", 'aria-labelledby="shop-home-deals-title"'],
    ["product rails", "rails.map("],
    ["concerns", 'aria-labelledby="shop-home-concerns-title"'],
    ["face scan", 'aria-labelledby="shop-home-scan-title"'],
    ["end card", 'className="shop-home-end"'],
    ["footer", "<footer"],
  ];

  test("the blocks are rendered from the published layout, in its order", () => {
    // The page renders each block by its id, in the order the admin layout gives (useHomeLayout). The header and the
    // skin quiz strip stay at the top; the skin scan and closing card sit after the blocks; the footer is last.
    const pinnedTop = ["mode switch", "skin quiz banner"];
    let last = -1;
    for (const [name, marker] of pinnedTop.map((n) => order.find(([k]) => k === n)!)) {
      const at = homeSource.indexOf(marker);
      assert.notEqual(at, -1, name + " is missing");
      assert.ok(at > last, name + " must be in the header area, in order");
      last = at;
    }
    assert.ok(homeSource.includes("layoutOrder.filter((id) => id !== 'footer').map("));
    for (const id of ["hero", "mini-banners", "offers", "categories", "promos", "deals", "reorder", "product-rails", "brands", "trust", "help-gift", "footer"]) {
      assert.match(homeSource, new RegExp("case '" + id + "':"), "block " + id + " is missing");
    }
    assert.ok(homeSource.indexOf("const pinnedTail") < homeSource.indexOf("{pinnedTail}"));
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
