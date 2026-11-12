import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { WISHLIST_MAX, cleanProductIds, mergeWishlists, planWishlistAdd } from "../../lib/shop/wishlist";

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

describe("wishlist cap", () => {
  test("the cap is 200 items", () => {
    assert.equal(WISHLIST_MAX, 200);
  });

  test("adding past the cap writes only the room left and reports the rest as full", () => {
    const existing = ids("a", 198);
    const incoming = ["x-1", "x-2", "x-3"];
    const plan = planWishlistAdd(existing, incoming);
    assert.deepEqual(plan.toWrite, ["x-1", "x-2"]);
    assert.deepEqual(plan.full, ["x-3"]);
  });

  test("a full list writes nothing", () => {
    const plan = planWishlistAdd(ids("a", 200), ["x-1"]);
    assert.deepEqual(plan.toWrite, []);
    assert.deepEqual(plan.full, ["x-1"]);
  });

  test("ids already saved are skipped, not counted against the cap", () => {
    const plan = planWishlistAdd(ids("a", 199), ["a-0", "a-5", "new-1", "new-2"]);
    assert.deepEqual(plan.toWrite, ["new-1"]);
    assert.deepEqual(plan.full, ["new-2"]);
  });

  test("duplicates in the incoming list are written once", () => {
    const plan = planWishlistAdd([], ["p-1", "p-1", "p-2"]);
    assert.deepEqual(plan.toWrite, ["p-1", "p-2"]);
  });

  test("invalid ids are dropped", () => {
    assert.deepEqual(cleanProductIds(["ok-1", "bad id", "", 7, null, "ok-1", "../x"]), ["ok-1"]);
    assert.deepEqual(cleanProductIds("not a list"), []);
  });
});

describe("wishlist merge on sign-in", () => {
  test("the account's items come first, then the device's new items", () => {
    const m = mergeWishlists(["d-1", "shared", "d-2"], ["shared", "a-1"]);
    assert.deepEqual(m.merged, ["shared", "a-1", "d-1", "d-2"]);
    assert.deepEqual(m.toPushToAccount, ["d-1", "d-2"]);
  });

  test("nothing is pushed when the device has nothing the account lacks", () => {
    const m = mergeWishlists(["a-1"], ["a-1", "a-2"]);
    assert.deepEqual(m.merged, ["a-1", "a-2"]);
    assert.deepEqual(m.toPushToAccount, []);
  });

  test("the merged list never passes the cap", () => {
    const m = mergeWishlists(ids("d", 50), ids("a", 180));
    assert.equal(m.merged.length, WISHLIST_MAX);
    assert.equal(m.toPushToAccount.length, 20);
    assert.ok(m.merged.slice(0, 180).every((id) => id.startsWith("a-")));
  });

  test("an empty device list keeps the account list", () => {
    const m = mergeWishlists([], ["a-1", "a-2"]);
    assert.deepEqual(m.merged, ["a-1", "a-2"]);
    assert.deepEqual(m.toPushToAccount, []);
  });
});
