import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { catalogReady, hideEmpty } from "../../glowvai-app/features/shop/lib/hideEmpty";
import { DELIVERY_ETA_MINUTES } from "../../lib/shop/delivery";
import { guestAreaAddress } from "../../glowvai-app/features/commerce/lib/guestArea";

const cats = [
  { id: "Serums", count: 4 },
  { id: "Treatments", count: 0 },
  { id: "Suncare", count: 2 },
];

describe("hide categories with no products", () => {
  test("drops empty categories once the catalogue has loaded", () => {
    assert.deepEqual(hideEmpty(cats, (c) => c.count, true).map((c) => c.id), ["Serums", "Suncare"]);
  });
  test("keeps everything while loading, so tabs do not flicker", () => {
    assert.equal(hideEmpty(cats, (c) => c.count, false).length, 3);
  });
  test("keeps the list when every entry is empty", () => {
    const empty = cats.map((c) => ({ ...c, count: 0 }));
    assert.equal(hideEmpty(empty, (c) => c.count, true).length, 3);
  });
  test("catalogReady is false while loading or failed", () => {
    assert.equal(catalogReady(false, false), true);
    assert.equal(catalogReady(true, false), false);
    assert.equal(catalogReady(false, true), false);
  });
});

describe("one delivery promise", () => {
  test("the shop default matches the website: 15 minutes", () => {
    assert.equal(DELIVERY_ETA_MINUTES, 15);
  });
  test("a guest area with no area time uses the shared constant", () => {
    assert.equal(guestAreaAddress({ area: "Benz Circle", pincode: "520010" }).deliveryMinutes, DELIVERY_ETA_MINUTES);
  });
});
