import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_FALLBACK_URL,
  firstPhotoUrl,
  getProductImageUrl,
  hasProductPhoto,
} from "../../glowvai-app/features/shop/shared/shopUtils";
import { categoryTiles } from "../../glowvai-app/features/shop/lib/homeModel";
import type { SkincareProduct } from "../../glowvai-app/core/data/indianSkincareCatalog";

const p = (id: string, category: SkincareProduct["category"], photo?: string): SkincareProduct =>
  ({
    id,
    brand: "B",
    name: `N ${id}`,
    category,
    price: 1,
    originalPrice: 1,
    imageSource: photo ? { uri: photo } : null,
  }) as unknown as SkincareProduct;

describe("product image fallback", () => {
  test("every product without a photo gets the same brand tile", () => {
    assert.equal(getProductImageUrl(p("a", "Serums")), PRODUCT_FALLBACK_URL);
    assert.equal(getProductImageUrl(p("b", "Treatments")), PRODUCT_FALLBACK_URL);
    assert.equal(hasProductPhoto(p("a", "Serums")), false);
  });
  test("a real photo wins", () => {
    assert.equal(getProductImageUrl(p("a", "Serums", "/x.webp")), "/x.webp");
    assert.equal(hasProductPhoto(p("a", "Serums", "/x.webp")), true);
  });
  test("firstPhotoUrl skips products without a photo and returns null when none", () => {
    assert.equal(firstPhotoUrl([p("a", "Serums"), p("b", "Serums", "/y.webp")]), "/y.webp");
    assert.equal(firstPhotoUrl([p("a", "Serums")]), null);
    assert.equal(firstPhotoUrl([]), null);
  });
  test("category tile sample prefers a product that has a photo", () => {
    const tiles = categoryTiles([p("a", "Treatments"), p("b", "Treatments", "/t.webp")]);
    assert.equal(tiles.find((t) => t.id === "Treatments")?.sample?.id, "b");
  });
});
