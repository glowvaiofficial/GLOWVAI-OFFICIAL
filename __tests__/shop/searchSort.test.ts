import { test } from "node:test";
import assert from "node:assert/strict";
import { sortProducts } from "@/glowvai-app/features/shop/shared/shopUtils";

const list = [
  { id: "a", price: 500, rating: 4.1 },
  { id: "b", price: 200, rating: null },
  { id: "c", price: 900, rating: 4.8 },
];

test("sortProducts orders by price and rating without mutating", () => {
  assert.deepEqual(sortProducts(list, "price-asc").map((p) => p.id), ["b", "a", "c"]);
  assert.deepEqual(sortProducts(list, "price-desc").map((p) => p.id), ["c", "a", "b"]);
  assert.deepEqual(sortProducts(list, "rating").map((p) => p.id), ["c", "a", "b"]);
  assert.deepEqual(sortProducts(list, "relevance").map((p) => p.id), ["a", "b", "c"]);
  assert.deepEqual(list.map((p) => p.id), ["a", "b", "c"]);
});
