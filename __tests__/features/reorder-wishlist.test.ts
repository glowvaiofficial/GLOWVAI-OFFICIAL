import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { catalogViewOf, splitReorder, type CatalogView } from "../../lib/shop/reorder";
import { cleanProductIds, mergeWishlists, planWishlistAdd, WISHLIST_MAX } from "../../lib/shop/wishlist";
import { addToWishlist, getWishlist, removeFromWishlist, type WishlistRepo } from "../../lib/shop/wishlistService";

const view = (id: string, over: Partial<CatalogView> = {}): CatalogView => ({
  productId: id,
  name: `Product ${id}`,
  brand: "Brand",
  imageUrl: "",
  published: true,
  unitPrice: 500,
  originalPrice: 600,
  stock: null,
  ...over,
});
const catalog = (...rows: CatalogView[]) => new Map(rows.map((r) => [r.productId, r]));

describe("reorder availability", () => {
  test("published, priced, in-stock items are available at the live price", () => {
    const r = splitReorder([{ productId: "p1", quantity: 2 }], catalog(view("p1", { unitPrice: 450 })), new Map([["p1", 500]]));
    assert.equal(r.unavailable.length, 0);
    assert.equal(r.available[0].quantity, 2);
    assert.equal(r.available[0].unitPrice, 450);
    assert.equal(r.available[0].previousUnitPrice, 500);
  });

  test("a product that is gone or unpublished is listed as unavailable, not dropped", () => {
    const r = splitReorder(
      [
        { productId: "gone", quantity: 1 },
        { productId: "draft", quantity: 1 },
      ],
      catalog(view("draft", { published: false })),
    );
    assert.deepEqual(
      r.unavailable.map((u) => [u.productId, u.reason]),
      [
        ["gone", "NOT_AVAILABLE"],
        ["draft", "NOT_AVAILABLE"],
      ],
    );
    assert.equal(r.available.length, 0);
  });

  test("zero stock is out of stock; a product with no price is listed separately", () => {
    const r = splitReorder(
      [
        { productId: "sold", quantity: 1 },
        { productId: "free", quantity: 1 },
      ],
      catalog(view("sold", { stock: 0 }), view("free", { unitPrice: 0 })),
    );
    assert.deepEqual(r.unavailable.map((u) => u.reason), ["OUT_OF_STOCK", "NO_PRICE"]);
  });

  test("when stock is short the customer gets what is left and is told the limit", () => {
    const r = splitReorder([{ productId: "p1", quantity: 5 }], catalog(view("p1", { stock: 2 })));
    assert.equal(r.available[0].quantity, 2);
    assert.equal(r.available[0].requested, 5);
    assert.equal(r.available[0].limitedBy, 2);
  });

  test("untracked stock is not limited; quantity is capped at ten per line", () => {
    const r = splitReorder([{ productId: "p1", quantity: 15 }], catalog(view("p1")));
    assert.equal(r.available[0].quantity, 10);
    assert.equal(r.available[0].limitedBy, null);
  });

  test("repeated lines for one product are added together; bad lines are ignored", () => {
    const r = splitReorder(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 2 },
        { productId: "bad id!", quantity: 1 },
        { productId: "p2", quantity: 0 },
      ],
      catalog(view("p1")),
    );
    assert.equal(r.available.length, 1);
    assert.equal(r.available[0].quantity, 3);
    assert.equal(r.unavailable.length, 0);
  });

  test("the live view of a products/{id} document follows publication, price and stock", () => {
    const v = catalogViewOf("p1", { status: "PUBLISHED", productName: "Serum", brandName: "B", brandPrice: 400, brandDiscount: 20, stock: 7.9, pictures: ["https://x/y.webp"] });
    assert.equal(v?.published, true);
    assert.equal(v?.unitPrice, 400);
    assert.equal(v?.originalPrice, 500);
    assert.equal(v?.stock, 7);
    assert.equal(catalogViewOf("p1", { status: "DRAFT" })?.published, false);
    assert.equal(catalogViewOf("p1", { status: "PUBLISHED", brandPrice: 100 })?.stock, null);
    assert.equal(catalogViewOf("p1", undefined), null);
  });
});

describe("wishlist rules", () => {
  test("ids are cleaned: strings only, no duplicates, no bad characters", () => {
    assert.deepEqual(cleanProductIds(["a", "a", 5, "b c", "d-1", "", null]), ["a", "d-1"]);
    assert.deepEqual(cleanProductIds("not a list"), []);
  });

  test("the cap is 200 items", () => {
    const many = Array.from({ length: 250 }, (_, i) => `p${i}`);
    assert.equal(cleanProductIds(many).length, WISHLIST_MAX);
  });

  test("adding skips what is already saved and stops at the cap", () => {
    const existing = Array.from({ length: 199 }, (_, i) => `e${i}`);
    const r = planWishlistAdd(existing, ["e1", "n1", "n2", "n3"]);
    assert.deepEqual(r.toWrite, ["n1"]);
    assert.deepEqual(r.full, ["n2", "n3"]);
    assert.deepEqual(planWishlistAdd(["a"], ["a"]).toWrite, []);
  });

  test("merging device and account keeps one copy of each and the account's order first", () => {
    const m = mergeWishlists(["a", "b"], ["b", "c"]);
    assert.deepEqual(m.merged, ["b", "c", "a"]);
    assert.deepEqual(m.toPushToAccount, ["a"]);
  });

  test("merging never exceeds 200, and the account's items are kept before the device's", () => {
    const account = Array.from({ length: 195 }, (_, i) => `acc${i}`);
    const device = Array.from({ length: 20 }, (_, i) => `dev${i}`);
    const m = mergeWishlists(device, account);
    assert.equal(m.merged.length, WISHLIST_MAX);
    assert.equal(m.merged.slice(0, 195).join(","), account.join(","));
    assert.equal(m.toPushToAccount.length, 5);
    assert.ok(m.toPushToAccount.every((id) => id.startsWith("dev")));
  });

  test("an empty device list and an empty account both work", () => {
    assert.deepEqual(mergeWishlists([], []).merged, []);
    assert.deepEqual(mergeWishlists(["x"], []).toPushToAccount, ["x"]);
  });
});

// A stub account store. Each customer has their own bucket, exactly like users/{uid}/wishlist.
function stubWishlist(): WishlistRepo & { rows: Map<string, string[]> } {
  const rows = new Map<string, string[]>();
  return {
    rows,
    async ids(uid) {
      return [...(rows.get(uid) ?? [])];
    },
    async add(uid, ids) {
      rows.set(uid, [...(rows.get(uid) ?? []), ...ids]);
    },
    async remove(uid, id) {
      rows.set(uid, (rows.get(uid) ?? []).filter((x) => x !== id));
    },
  };
}

describe("account wishlist with a stub store", () => {
  test("adds without duplicates and reports what did not fit under the cap", async () => {
    const repo = stubWishlist();
    const first = await addToWishlist(repo, "uid-a", ["p1", "p2"], 1);
    assert.deepEqual(first.added, ["p1", "p2"]);
    const again = await addToWishlist(repo, "uid-a", ["p2", "p3"], 2);
    assert.deepEqual(again.added, ["p3"]);
    assert.deepEqual(await getWishlist(repo, "uid-a"), ["p1", "p2", "p3"]);
  });

  test("the account stops at 200 items across calls", async () => {
    const repo = stubWishlist();
    const batch = Array.from({ length: 200 }, (_, i) => `p${i}`);
    await addToWishlist(repo, "uid-a", batch, 1);
    const r = await addToWishlist(repo, "uid-a", ["extra"], 2);
    assert.deepEqual(r.added, []);
    assert.deepEqual(r.full, ["extra"]);
    assert.equal((await getWishlist(repo, "uid-a")).length, 200);
  });

  test("one customer cannot see or remove another customer's saved products", async () => {
    const repo = stubWishlist();
    await addToWishlist(repo, "uid-a", ["secret-product"], 1);
    assert.deepEqual(await getWishlist(repo, "uid-b"), []);
    const after = await removeFromWishlist(repo, "uid-b", "secret-product");
    assert.deepEqual(after, []);
    assert.deepEqual(await getWishlist(repo, "uid-a"), ["secret-product"]);
  });

  test("removing an item saves only that item's removal", async () => {
    const repo = stubWishlist();
    await addToWishlist(repo, "uid-a", ["p1", "p2"], 1);
    assert.deepEqual(await removeFromWishlist(repo, "uid-a", "p1"), ["p2"]);
    assert.deepEqual(await removeFromWishlist(repo, "uid-a", "not-there"), ["p2"]);
  });
});
