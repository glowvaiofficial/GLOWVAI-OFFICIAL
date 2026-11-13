import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_ITEM_LIMITS, pickDeals, readBlockSettings } from "@/lib/shop/homeLayout";
import { reorderProductIds, reorderRailItems } from "@/lib/shop/reorderRail";
import type { CatalogView } from "@/lib/shop/reorder";

const deal = (link: string, over: Record<string, unknown> = {}) => ({ label: "Product " + link, sub: "Sub", link, image: "", ...over });
const doc = (items: unknown[]) => ({ blocks: [{ id: "deals", enabled: true, position: 0, settings: { title: "", background: "", textColor: "", items } }] });
const dealsOf = (items: unknown[]) => readBlockSettings(doc(items)).deals?.items ?? [];

describe("deals: admin-chosen product list", () => {
  test("a valid product id is kept, with the image forced to empty", () => {
    const got = dealsOf([deal("abc-123", { image: "data:image/png;base64,AAAA" })]);
    assert.equal(got.length, 1);
    assert.equal(got[0].link, "abc-123");
    assert.equal(got[0].image, "");
  });

  test("a bad product id is dropped; a path or other characters are not product ids", () => {
    const got = dealsOf([deal("/shop/abc"), deal("abc_123"), deal("abc 1"), deal(""), deal("x".repeat(129)), deal("ok-1")]);
    assert.deepEqual(got.map((i) => i.link), ["ok-1"]);
  });

  test("a bad label or sub drops the item", () => {
    const got = dealsOf([deal("a1", { label: "" }), deal("a2", { label: "x".repeat(41) }), deal("a3", { sub: "y".repeat(81) }), deal("a4")]);
    assert.deepEqual(got.map((i) => i.link), ["a4"]);
  });

  test("the order the admin set is kept", () => {
    const got = dealsOf([deal("c3"), deal("a1"), deal("b2")]);
    assert.deepEqual(got.map((i) => i.link), ["c3", "a1", "b2"]);
  });

  test("at most 8 items are kept", () => {
    assert.equal(BLOCK_ITEM_LIMITS.deals, 8);
    const got = dealsOf(Array.from({ length: 11 }, (_, i) => deal("p" + i)));
    assert.equal(got.length, 8);
    assert.equal(got[7].link, "p7");
  });

  test("no valid items means no settings, so the built-in deals show", () => {
    assert.equal(readBlockSettings(doc([])).deals, undefined);
    assert.equal(readBlockSettings(doc([deal("/bad")])).deals, undefined);
  });

  test("pickDeals keeps published products only, in the admin's order, each once, and skips the rest", () => {
    const catalog = [{ id: "a1", n: 1 }, { id: "b2", n: 2 }, { id: "c3", n: 3 }];
    const items = [{ link: "c3" }, { link: "gone" }, { link: "a1" }, { link: "c3" }, { link: "b2" }];
    assert.deepEqual(pickDeals(items, catalog).map((p) => p.id), ["c3", "a1", "b2"]);
  });

  test("pickDeals never returns more than the limit", () => {
    const catalog = Array.from({ length: 12 }, (_, i) => ({ id: "p" + i }));
    const items = catalog.map((p) => ({ link: p.id }));
    assert.equal(pickDeals(items, catalog).length, 8);
    assert.equal(pickDeals(items, catalog, 3).length, 3);
  });
});

const view = (id: string, over: Partial<CatalogView> = {}): CatalogView => ({
  productId: id, name: "Name " + id, brand: "B", imageUrl: "https://img/" + id + ".webp", published: true,
  unitPrice: 450, originalPrice: 500, stock: null, ...over,
});
const catalog = (...rows: CatalogView[]) => new Map(rows.map((r) => [r.productId, r] as const));

describe("reorder rail: what the route returns", () => {
  test("the response rows carry product id, name, price now and image", () => {
    const rows = reorderRailItems(["p1"], catalog(view("p1", { unitPrice: 399 })));
    assert.deepEqual(rows, [{ productId: "p1", name: "Name p1", price: 399, image: "https://img/p1.webp" }]);
  });

  test("at most six distinct products, in the order of the orders", () => {
    const orders = [
      { userId: "me", status: "DELIVERED", items: [{ productId: "a" }, { productId: "b" }, { productId: "a" }] },
      { userId: "me", status: "PLACED", items: [{ productId: "c" }, { productId: "d" }, { productId: "e" }, { productId: "f" }, { productId: "g" }] },
    ];
    const ids = reorderProductIds(orders, "me");
    assert.deepEqual(ids, ["a", "b", "c", "d", "e", "f"]);
    const rows = reorderRailItems(ids, catalog(...ids.map((i) => view(i))));
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map((r) => r.productId), ids);
  });

  test("products that are gone, unpublished, unpriced or out of stock are left out", () => {
    const rows = reorderRailItems(["ok", "gone", "off", "free", "none"], catalog(
      view("ok"), view("off", { published: false }), view("free", { unitPrice: 0 }), view("none", { stock: 0 }),
    ));
    assert.deepEqual(rows.map((r) => r.productId), ["ok"]);
  });
});

describe("reorder rail: never another customer's data", () => {
  test("orders of other customers are not used", () => {
    const orders = [
      { userId: "someone-else", status: "DELIVERED", items: [{ productId: "secret" }] },
      { userId: "me", status: "DELIVERED", items: [{ productId: "mine" }] },
    ];
    assert.deepEqual(reorderProductIds(orders, "me"), ["mine"]);
    assert.deepEqual(reorderProductIds(orders, "nobody-with-orders"), []);
  });

  test("cancelled orders and bad product ids are left out", () => {
    const orders = [
      { userId: "me", status: "CANCELLED", items: [{ productId: "cancelled" }] },
      { userId: "me", status: "VENDOR_REJECTED", items: [{ productId: "rejected" }] },
      { userId: "me", status: "PLACED", items: [{ productId: "../etc" }, { productId: "" }, { productId: "kept" }] },
    ];
    assert.deepEqual(reorderProductIds(orders, "me"), ["kept"]);
  });

  test("with no signed-in customer id, nothing is returned", () => {
    assert.deepEqual(reorderProductIds([{ userId: "", status: "PLACED", items: [{ productId: "x" }] }], ""), []);
  });
});
