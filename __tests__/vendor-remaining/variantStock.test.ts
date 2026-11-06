import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Variant } from "../../lib/shop/variants";
import { lineKeyOf } from "../../lib/shop/variants";
import { missingStock, neededStock, uncheckedItems, toVendorOrder } from "../../lib/vendor/orders";
import { MAX_STOCK, inventoryKey, parseInventory, variantLineProblem } from "../../lib/vendor/validation";

const variants: Variant[] = [
  { id: "50ml", label: "50 ml", price: 400, mrp: 500, stock: 12, isAvailable: true, sku: "SER-50" },
  { id: "100ml", label: "100 ml", price: 700, mrp: 900, stock: null, isAvailable: true },
];

describe("per-option inventory writes", () => {
  test("a per-option line is keyed productId::variantId and a product line keeps its own key", () => {
    assert.equal(inventoryKey("serum-1", "50ml"), "serum-1::50ml");
    assert.equal(inventoryKey("serum-1"), "serum-1");
    assert.equal(inventoryKey("serum-1", null), "serum-1");
    assert.equal(lineKeyOf("serum-1", "50ml"), inventoryKey("serum-1", "50ml"));
  });

  test("a product line and an option line of the same product can be sent together", () => {
    const r = parseInventory({
      items: [
        { productId: "serum-1", stock: 3, isAvailable: true },
        { productId: "serum-1", variantId: "50ml", stock: 2, isAvailable: true },
      ],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value[1].variantId, "50ml");
  });

  test("stock bounds: whole numbers from 0 to the maximum", () => {
    for (const bad of [-1, 1.5, MAX_STOCK + 1, Number.NaN, "5"]) {
      const r = parseInventory({ items: [{ productId: "serum-1", variantId: "50ml", stock: bad, isAvailable: true }] });
      assert.equal(r.ok, false, String(bad));
      if (!r.ok) assert.equal(r.field, "items.stock");
    }
    assert.equal(parseInventory({ items: [{ productId: "serum-1", variantId: "50ml", stock: 0, isAvailable: false }] }).ok, true);
    assert.equal(parseInventory({ items: [{ productId: "serum-1", variantId: "50ml", stock: MAX_STOCK, isAvailable: true }] }).ok, true);
  });

  test("a malformed option id is refused", () => {
    for (const bad of ["", "50 ML", "../x", "a::b", "x".repeat(41), 7]) {
      const r = parseInventory({ items: [{ productId: "serum-1", variantId: bad, stock: 1, isAvailable: true }] });
      assert.equal(r.ok, false, String(bad));
      if (!r.ok) assert.equal(r.field, "items.variantId");
    }
  });

  test("a store price cannot be set on an option (prices stay on the product line)", () => {
    const r = parseInventory({ items: [{ productId: "serum-1", variantId: "50ml", stock: 1, isAvailable: true, unitPriceOverride: 300 }] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.field, "items.unitPriceOverride");
  });

  test("the same option twice in one request is refused", () => {
    const r = parseInventory({
      items: [
        { productId: "serum-1", variantId: "50ml", stock: 1, isAvailable: true },
        { productId: "serum-1", variantId: "50ml", stock: 2, isAvailable: true },
      ],
    });
    assert.equal(r.ok, false);
  });

  test("an option the product does not have is refused, and a product without options refuses any option", () => {
    assert.match(variantLineProblem(variants, "1kg") ?? "", /not one of this product's options/);
    assert.equal(variantLineProblem(variants, "50ml"), null);
    assert.match(variantLineProblem(null, "50ml") ?? "", /no options/);
    assert.match(variantLineProblem([], "50ml") ?? "", /no options/);
  });
});

describe("orders with options use the option's stock line", () => {
  const order = {
    orderId: "GV-1",
    vendorUid: "uid-1",
    status: "PLACED",
    items: [
      { productId: "serum-1", variantId: "50ml", variantLabel: "50 ml", productName: "Serum", quantity: 2, unitPrice: 400 },
      { productId: "serum-1", variantId: "100ml", variantLabel: "100 ml", productName: "Serum", quantity: 1, unitPrice: 700 },
      { productId: "soap-9", variantId: null, productName: "Soap", quantity: 1, unitPrice: 90 },
    ],
  };

  test("each option is its own line, and a product without options keeps the plain key", () => {
    const need = neededStock(order);
    assert.deepEqual([...need.keys()].sort(), ["serum-1::100ml", "serum-1::50ml", "soap-9"]);
    assert.equal(need.get("serum-1::50ml")?.quantity, 2);
  });

  test("a missing option is reported with its product and option, and an unavailable line counts as missing", () => {
    const missing = missingStock(order, [
      { productId: "serum-1::50ml", exists: true, stock: 1, isAvailable: true },
      { productId: "serum-1::100ml", exists: true, stock: 5, isAvailable: false },
      { productId: "soap-9", exists: true, stock: 4, isAvailable: true },
    ]);
    assert.deepEqual(
      missing.map((m) => [m.productId, m.variantId, m.need, m.have]),
      [
        ["serum-1", "50ml", 2, 1],
        ["serum-1", "100ml", 1, 0],
      ],
    );
  });

  test("packing ticks once per product, so one tick covers both options of a product", () => {
    assert.deepEqual(uncheckedItems(order, ["serum-1"]), ["soap-9"]);
    assert.deepEqual(uncheckedItems(order, ["serum-1", "soap-9"]), []);
  });

  test("the vendor's order view carries the option label, not stock keys", () => {
    const v = toVendorOrder(order, { uid: "uid-1", isOffer: false, orderId: "GV-1" });
    assert.equal(v.items[0].variantId, "50ml");
    assert.equal(v.items[0].variantLabel, "50 ml");
    assert.equal(v.items[2].variantId, null);
    assert.equal(JSON.stringify(v).includes("::"), false);
  });
});
