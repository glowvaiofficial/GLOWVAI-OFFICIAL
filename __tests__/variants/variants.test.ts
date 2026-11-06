import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CHOOSE_VARIANT_MESSAGE,
  MAX_VARIANTS,
  UNAVAILABLE_PRODUCT_MESSAGE,
  UNKNOWN_VARIANT_MESSAGE,
  currentUnitPrice,
  defaultVariant,
  fromPrice,
  lineKeyOf,
  lineStillSold,
  migrateCartLines,
  orderItemFor,
  orderReservationFor,
  parseCartLines,
  planOrderStock,
  planVariantRelease,
  planVariantRetake,
  readProductVariants,
  reservedProductIds,
  reservedVariantLinesOf,
  resolveVariant,
  setVariants,
  validateVariants,
  variantStockState,
  type StockProduct,
  type Variant,
} from "../../lib/shop/variants";
import { FakeStore, asFirestore } from "./fakeStore";

const v = (over: Partial<Variant> & { id: string }): Record<string, unknown> => ({
  label: over.id,
  price: 300,
  mrp: 600,
  stock: 5,
  isAvailable: true,
  ...over,
});

const valid = (over: Partial<Variant> & { id: string }): Variant => ({ label: over.id, price: 300, mrp: 600, stock: 5, isAvailable: true, ...over });

const products = (rows: Record<string, StockProduct | undefined>) => new Map(Object.entries(rows));

const serumWithSizes: StockProduct = {
  status: "PUBLISHED",
  productName: "Vitamin C Serum",
  brandPrice: 999,
  stock: 50,
  variants: [v({ id: "30-ml", label: "30 ml", price: 499, mrp: 600, stock: 3 }), v({ id: "15-ml", label: "15 ml", price: 299, mrp: 350, stock: 0 })],
};

describe("validateVariants", () => {
  test("accepts a valid list and drops fields it does not know", () => {
    const out = validateVariants([{ id: "shade-02", label: "Shade 02 Fair", price: 450, mrp: 500, stock: null, isAvailable: true, sku: "VC-02", junk: 1 }]);
    assert.deepEqual(out, {
      ok: true,
      variants: [{ id: "shade-02", label: "Shade 02 Fair", price: 450, mrp: 500, stock: null, isAvailable: true, sku: "VC-02" }],
    });
  });

  test("an empty list is valid (the product is sold as one item)", () => {
    assert.deepEqual(validateVariants([]), { ok: true, variants: [] });
  });

  test("a non-list is refused", () => {
    const out = validateVariants({ id: "x" });
    assert.equal(out.ok, false);
  });

  test("at most 20 variants per product: 20 pass, 21 fail", () => {
    const twenty = Array.from({ length: MAX_VARIANTS }, (_, i) => v({ id: `v-${i}`, label: `Option ${i}` }));
    assert.equal(validateVariants(twenty).ok, true);
    const out = validateVariants([...twenty, v({ id: "v-extra", label: "Extra" })]);
    assert.equal(out.ok, false);
    assert.match(out.ok ? "" : out.errors.join(" "), /at most 20/);
  });

  test("slug format: lowercase letters, numbers and hyphens, 1 to 40 characters", () => {
    for (const bad of ["", "Big", "has space", "under_score", "a".repeat(41), "dot.id"]) {
      assert.equal(validateVariants([v({ id: bad })]).ok, false, `id ${JSON.stringify(bad)} should fail`);
    }
    for (const good of ["a", "30-ml", "shade-02", "a".repeat(40)]) {
      assert.equal(validateVariants([v({ id: good, label: good })]).ok, true, `id ${good} should pass`);
    }
  });

  test("duplicate ids are refused", () => {
    const out = validateVariants([v({ id: "a", label: "One" }), v({ id: "a", label: "Two" })]);
    assert.equal(out.ok, false);
    assert.match(out.ok ? "" : out.errors.join(" "), /already used/);
  });

  test("duplicate labels are refused, ignoring case", () => {
    const out = validateVariants([v({ id: "a", label: "30 ml" }), v({ id: "b", label: "30 ML" })]);
    assert.equal(out.ok, false);
  });

  test("label is 1 to 40 characters after trimming", () => {
    assert.equal(validateVariants([v({ id: "a", label: "   " })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", label: "x".repeat(41) })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", label: "x".repeat(40) })]).ok, true);
  });

  test("price is a whole rupee amount above zero", () => {
    for (const bad of [0, -5, 99.5, Number.NaN, "300", 2_000_000]) {
      assert.equal(validateVariants([v({ id: "a", price: bad as number })]).ok, false, `price ${String(bad)}`);
    }
  });

  test("MRP is a whole amount and at least the price", () => {
    assert.equal(validateVariants([v({ id: "a", price: 300, mrp: 299 })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", price: 300, mrp: 300 })]).ok, true);
    assert.equal(validateVariants([v({ id: "a", price: 300, mrp: 300.5 })]).ok, false);
  });

  test("stock is null (not tracked) or a whole number from zero", () => {
    assert.equal(validateVariants([v({ id: "a", stock: null })]).ok, true);
    assert.equal(validateVariants([v({ id: "a", stock: 0 })]).ok, true);
    assert.equal(validateVariants([v({ id: "a", stock: -1 })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", stock: 2.5 })]).ok, false);
    const missing = { id: "a", label: "A", price: 300, mrp: 300, isAvailable: true };
    assert.equal(validateVariants([missing]).ok, false, "stock must be given explicitly");
  });

  test("isAvailable must be a boolean", () => {
    assert.equal(validateVariants([v({ id: "a", isAvailable: "yes" as unknown as boolean })]).ok, false);
  });

  test("sku is optional, 1 to 40 characters when given", () => {
    assert.equal(validateVariants([v({ id: "a", sku: "" })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", sku: "x".repeat(41) })]).ok, false);
    assert.equal(validateVariants([v({ id: "a", sku: "x".repeat(40) })]).ok, true);
    const none = validateVariants([v({ id: "a", sku: undefined })]);
    assert.equal(none.ok && "sku" in none.variants[0], false);
  });

  test("errors name the variant by position", () => {
    const out = validateVariants([v({ id: "ok" }), v({ id: "BAD" })]);
    assert.equal(out.ok, false);
    assert.match(out.ok ? "" : out.errors.join(" "), /Variant 2/);
  });
});

describe("readProductVariants", () => {
  test("a missing field, null or an empty list means no variants", () => {
    assert.deepEqual(readProductVariants(undefined), { ok: true, variants: null });
    assert.deepEqual(readProductVariants(null), { ok: true, variants: null });
    assert.deepEqual(readProductVariants([]), { ok: true, variants: null });
  });

  test("a broken stored list is not sold (ok false)", () => {
    assert.deepEqual(readProductVariants([{ id: "BAD" }]), { ok: false });
  });

  test("a valid stored list comes back cleaned", () => {
    const out = readProductVariants([v({ id: "a" })]);
    assert.equal(out.ok && out.variants?.length, 1);
  });
});

describe("default variant and option resolution", () => {
  const list = (rows: Partial<Variant>[]) => rows.map((r, i) => valid({ id: `v${i}`, label: `Option ${i}`, ...r }));

  test("the default is the first sellable variant", () => {
    const variants = list([{ stock: 0 }, { stock: 4 }, { stock: 9 }]);
    assert.equal(defaultVariant(variants).id, "v1");
  });

  test("an untracked variant (stock null) counts as sellable", () => {
    assert.equal(defaultVariant(list([{ isAvailable: false }, { stock: null }])).id, "v1");
  });

  test("when nothing is sellable the default is the first listed", () => {
    assert.equal(defaultVariant(list([{ stock: 0 }, { isAvailable: false }])).id, "v0");
  });

  test("a product without variants resolves to no variant, and an id for it is refused", () => {
    assert.deepEqual(resolveVariant(null, undefined), { ok: true, variant: null });
    assert.deepEqual(resolveVariant(null, ""), { ok: true, variant: null });
    assert.deepEqual(resolveVariant(null, "30-ml"), { ok: false, error: UNKNOWN_VARIANT_MESSAGE });
  });

  test("a product with variants needs a variant id", () => {
    assert.deepEqual(resolveVariant(list([{}]), null), { ok: false, error: CHOOSE_VARIANT_MESSAGE });
  });

  test("an unknown or malformed variant id is refused", () => {
    const variants = list([{}]);
    for (const bad of ["nope", "V0", "../x", 7, {}]) {
      assert.deepEqual(resolveVariant(variants, bad), { ok: false, error: UNKNOWN_VARIANT_MESSAGE }, `id ${JSON.stringify(bad)}`);
    }
  });

  test("a known id resolves to that variant", () => {
    const variants = list([{}, { price: 800 }]);
    const pick = resolveVariant(variants, "v1");
    assert.equal(pick.ok && pick.variant?.price, 800);
  });

  test("cart keys: the product id alone without a variant, productId::variantId with one", () => {
    assert.equal(lineKeyOf("prod-1"), "prod-1");
    assert.equal(lineKeyOf("prod-1", null), "prod-1");
    assert.equal(lineKeyOf("prod-1", "30-ml"), "prod-1::30-ml");
  });
});

describe("price and stock for a variant", () => {
  test("fromPrice is the cheapest sellable variant", () => {
    const variants = [valid({ id: "a", price: 200, mrp: 250, stock: 0 }), valid({ id: "b", price: 300, mrp: 350 }), valid({ id: "c", price: 260, mrp: 400 })];
    assert.deepEqual(fromPrice(variants), { price: 260, mrp: 400 });
  });

  test("fromPrice falls back to every variant when none is sellable", () => {
    const variants = [valid({ id: "a", price: 200, mrp: 250, stock: 0 }), valid({ id: "b", price: 150, mrp: 180, isAvailable: false })];
    assert.equal(fromPrice(variants).price, 150);
  });

  test("stock wording: out, low (5 or fewer) and in", () => {
    assert.deepEqual(variantStockState(valid({ id: "a", stock: 0 })), { state: "out", count: 0 });
    assert.deepEqual(variantStockState(valid({ id: "a", stock: 5 })), { state: "low", count: 5 });
    assert.deepEqual(variantStockState(valid({ id: "a", stock: 6 })), { state: "in", count: 6 });
    assert.deepEqual(variantStockState(valid({ id: "a", stock: null })), { state: "in", count: null });
    assert.equal(variantStockState(valid({ id: "a", stock: 9, isAvailable: false })).state, "out");
  });
});

describe("parseCartLines", () => {
  test("two sizes of one product are two lines; the same size twice is one line with the sum", () => {
    const out = parseCartLines(
      [
        { productId: "p1", variantId: "30-ml", quantity: 1 },
        { productId: "p1", variantId: "15-ml", quantity: 2 },
        { productId: "p1", variantId: "30-ml", quantity: 2 },
      ],
      10,
    );
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.deepEqual(out.lines, [
      { productId: "p1", variantId: "30-ml", quantity: 3 },
      { productId: "p1", variantId: "15-ml", quantity: 2 },
    ]);
  });

  test("quantity is capped per line", () => {
    const out = parseCartLines([{ productId: "p1", quantity: 9 }, { productId: "p1", quantity: 9 }], 10);
    assert.equal(out.ok && out.lines[0].quantity, 10);
  });

  test("a line without a variant id has variantId null", () => {
    const out = parseCartLines([{ productId: "p1", quantity: 1 }], 10);
    assert.equal(out.ok && out.lines[0].variantId, null);
  });

  test("bad input is refused with a message", () => {
    assert.equal(parseCartLines([{ quantity: 1 }], 10).ok, false);
    assert.equal(parseCartLines([{ productId: "p/1", quantity: 1 }], 10).ok, false);
    assert.equal(parseCartLines([{ productId: "p1", quantity: 0 }], 10).ok, false);
    assert.equal(parseCartLines([{ productId: "p1", quantity: 1, variantId: 5 }], 10).ok, false);
    assert.deepEqual(parseCartLines([{ productId: "p1", quantity: 1, variantId: "Bad Id" }], 10), { ok: false, error: UNKNOWN_VARIANT_MESSAGE });
  });
});

describe("pricing an order line from the product document", () => {
  test("a variant line is priced from the variant, with its id and label on the item", () => {
    const out = orderItemFor(serumWithSizes, { productId: "serum", variantId: "30-ml", quantity: 2 });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.item.unitPrice, 499);
    assert.equal(out.item.totalPrice, 998);
    assert.equal(out.item.variantId, "30-ml");
    assert.equal(out.item.variantLabel, "30 ml");
  });

  test("a product without variants is priced from brandPrice, exactly as before", () => {
    const out = orderItemFor({ status: "PUBLISHED", productName: "Cleanser", brandPrice: 350.4 }, { productId: "c", variantId: null, quantity: 1 });
    assert.equal(out.ok && out.item.unitPrice, 350);
    assert.equal(out.ok && out.item.variantId, null);
    assert.equal(out.ok && out.item.variantLabel, null);
  });

  test("an unpublished, missing or broken product is refused", () => {
    assert.deepEqual(orderItemFor(undefined, { productId: "x", variantId: null, quantity: 1 }), { ok: false, status: 409, error: UNAVAILABLE_PRODUCT_MESSAGE });
    assert.equal(orderItemFor({ ...serumWithSizes, status: "DRAFT" }, { productId: "x", variantId: "30-ml", quantity: 1 }).ok, false);
    assert.equal(orderItemFor({ ...serumWithSizes, variants: [{ id: "BAD" }] }, { productId: "x", variantId: "30-ml", quantity: 1 }).ok, false);
  });

  test("a variant product line with no variant, or an unknown variant, is refused with a clear message", () => {
    const noVariant = orderItemFor(serumWithSizes, { productId: "serum", variantId: null, quantity: 1 });
    assert.deepEqual(noVariant, { ok: false, status: 409, error: CHOOSE_VARIANT_MESSAGE });
    const unknown = orderItemFor(serumWithSizes, { productId: "serum", variantId: "1-l", quantity: 1 });
    assert.deepEqual(unknown, { ok: false, status: 409, error: UNKNOWN_VARIANT_MESSAGE });
    const stray = orderItemFor({ status: "PUBLISHED", productName: "Soap", brandPrice: 80 }, { productId: "soap", variantId: "30-ml", quantity: 1 });
    assert.deepEqual(stray, { ok: false, status: 409, error: UNKNOWN_VARIANT_MESSAGE });
  });

  test("the current price of a line, or null when it can no longer be bought", () => {
    assert.equal(currentUnitPrice(serumWithSizes, "15-ml"), 299);
    assert.equal(currentUnitPrice(serumWithSizes, "1-l"), null);
    assert.equal(currentUnitPrice({ status: "PUBLISHED", brandPrice: 120 }, null), 120);
  });
});

describe("planOrderStock: variant and product stock", () => {
  test("a variant line takes that variant's stock and leaves product stock alone", () => {
    const plan = planOrderStock([{ productId: "serum", variantId: "30-ml", quantity: 2 }], products({ serum: serumWithSizes }));
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.decrements, [], "no product-level decrement");
    assert.equal(plan.variantWrites.length, 1);
    const [write] = plan.variantWrites;
    assert.equal(write.variants.find((x) => x.id === "30-ml")?.stock, 1);
    assert.equal(write.variants.find((x) => x.id === "15-ml")?.stock, 0, "the other size is not touched");
    assert.deepEqual(write.changes, [{ productId: "serum", variantId: "30-ml", quantity: 2, before: 3, after: 1 }]);
  });

  test("a product line takes product stock and never touches variants", () => {
    const plain: StockProduct = { status: "PUBLISHED", productName: "Soap", brandPrice: 80, stock: 10 };
    const plan = planOrderStock([{ productId: "soap", variantId: null, quantity: 4 }], products({ soap: plain }));
    assert.equal(plan.ok && plan.decrements[0].after, 6);
    assert.equal(plan.ok && plan.variantWrites.length, 0);
  });

  test("two sizes of one product in one order are each taken from their own stock", () => {
    const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: 3 }), v({ id: "15-ml", label: "15 ml", stock: 4 })] };
    const plan = planOrderStock(
      [
        { productId: "serum", variantId: "30-ml", quantity: 1 },
        { productId: "serum", variantId: "15-ml", quantity: 2 },
      ],
      products({ serum }),
    );
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.variantWrites.length, 1, "one product document is written once");
    const writes = plan.variantWrites[0].variants;
    assert.equal(writes.find((x) => x.id === "30-ml")?.stock, 2);
    assert.equal(writes.find((x) => x.id === "15-ml")?.stock, 2);
  });

  test("the same variant named twice is checked once against the full quantity", () => {
    const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: 3 })] };
    const plan = planOrderStock(
      [
        { productId: "serum", variantId: "30-ml", quantity: 2 },
        { productId: "serum", variantId: "30-ml", quantity: 2 },
      ],
      products({ serum }),
    );
    assert.equal(plan.ok, false, "4 units do not fit in 3");
    if (plan.ok) return;
    assert.match(plan.message, /Only 3 of Vitamin C Serum \(30 ml\) left/);
  });

  test("an exact match is allowed and leaves zero", () => {
    const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: 3 })] };
    const plan = planOrderStock([{ productId: "serum", variantId: "30-ml", quantity: 3 }], products({ serum }));
    assert.equal(plan.ok && plan.variantWrites[0].variants[0].stock, 0);
  });

  test("a sold-out variant is refused with its label, and nothing is planned", () => {
    const plan = planOrderStock([{ productId: "serum", variantId: "15-ml", quantity: 1 }], products({ serum: serumWithSizes }));
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.match(plan.message, /Vitamin C Serum \(15 ml\) is sold out/);
  });

  test("an unavailable variant is refused even with stock", () => {
    const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: 9, isAvailable: false })] };
    const plan = planOrderStock([{ productId: "serum", variantId: "30-ml", quantity: 1 }], products({ serum }));
    assert.equal(plan.ok, false);
  });

  test("an untracked variant (stock null) is sold without a decrement", () => {
    const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: null })] };
    const plan = planOrderStock([{ productId: "serum", variantId: "30-ml", quantity: 5 }], products({ serum }));
    assert.equal(plan.ok && plan.variantWrites.length, 0);
    assert.equal(plan.ok && plan.decrements.length, 0);
  });

  test("a line for a product with variants never falls back to product stock", () => {
    const plan = planOrderStock([{ productId: "serum", variantId: null, quantity: 1 }], products({ serum: serumWithSizes }));
    assert.equal(plan.ok, false, "a variant product needs a variant id");
  });

  test("a missing product blocks the whole order and nothing is planned", () => {
    const plain: StockProduct = { status: "PUBLISHED", productName: "Soap", brandPrice: 80, stock: 10 };
    const plan = planOrderStock(
      [
        { productId: "soap", variantId: null, quantity: 1 },
        { productId: "gone", variantId: null, quantity: 1 },
      ],
      products({ soap: plain, gone: undefined }),
    );
    assert.equal(plan.ok, false);
  });

  test("one short line stops the whole order: no product or variant is decremented", () => {
    const plain: StockProduct = { status: "PUBLISHED", productName: "Soap", brandPrice: 80, stock: 10 };
    const plan = planOrderStock(
      [
        { productId: "soap", variantId: null, quantity: 1 },
        { productId: "serum", variantId: "30-ml", quantity: 9 },
      ],
      products({ soap: plain, serum: serumWithSizes }),
    );
    assert.equal(plan.ok, false);
  });
});

describe("reservations and release, pure", () => {
  const serum = { ...serumWithSizes, variants: [v({ id: "30-ml", label: "30 ml", stock: 3 }), v({ id: "15-ml", label: "15 ml", stock: 2 })] };
  const plan = planOrderStock(
    [
      { productId: "serum", variantId: "30-ml", quantity: 2 },
      { productId: "soap", variantId: null, quantity: 1 },
    ],
    products({ serum, soap: { status: "PUBLISHED", productName: "Soap", brandPrice: 80, stock: 10 } }),
  );

  test("the order reservation records variant lines next to product lines", () => {
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const reservation = orderReservationFor(plan);
    assert.deepEqual(reservation.variants, [{ productId: "serum", variantId: "30-ml", quantity: 2 }]);
    assert.deepEqual(reservation.platform, [{ productId: "soap", quantity: 1 }]);
    assert.equal(reservation.releasedAt, null);
  });

  test("reserved product ids cover both kinds of line, and bad stored lines are ignored", () => {
    const reservation = { platform: [{ productId: "soap", quantity: 1 }], variants: [{ productId: "serum", variantId: "30-ml", quantity: 2 }, { productId: "x", variantId: "BAD", quantity: 1 }] };
    assert.deepEqual(reservedProductIds(reservation).sort(), ["serum", "soap"]);
    assert.deepEqual(reservedVariantLinesOf(reservation), [{ productId: "serum", variantId: "30-ml", quantity: 2 }]);
    assert.deepEqual(reservedVariantLinesOf({ platform: [] }), []);
  });

  test("release gives variant stock back, and not again once released", () => {
    if (!plan.ok) return;
    const reservation = orderReservationFor(plan);
    const before = products({ serum: { ...serum, variants: plan.variantWrites[0].variants } });
    const once = planVariantRelease(reservation, before);
    assert.equal(once[0].variants.find((x) => x.id === "30-ml")?.stock, 3, "back to the original 3");
    const released = { ...reservation, releasedAt: 123 };
    assert.deepEqual(planVariantRelease(released, before), []);
  });

  test("retake takes stock again, clamps at zero and reports the short line", () => {
    if (!plan.ok) return;
    const reservation = { ...orderReservationFor(plan), releasedAt: 1 };
    const low = products({ serum: { ...serum, variants: [v({ id: "30-ml", label: "30 ml", stock: 1 }), v({ id: "15-ml", label: "15 ml", stock: 2 })] } });
    const out = planVariantRetake(reservation, low);
    assert.equal(out.writes[0].variants.find((x) => x.id === "30-ml")?.stock, 0);
    assert.equal(out.short.length, 1);
    assert.equal(out.short[0].requested, 2);
    assert.equal(out.short[0].available, 1);
    assert.match(out.short[0].name, /30 ml/);
  });

  test("a reservation without variant lines plans nothing for variants (old orders)", () => {
    const old = { platform: [{ productId: "soap", quantity: 1 }], releasedAt: null };
    assert.deepEqual(planVariantRelease(old, products({})), []);
  });
});

describe("cart migration and catalogue reconcile", () => {
  type Line = { productId: string; variantId?: string | null; variantLabel?: string | null; name: string; price: number; mrp?: number; quantity: number };
  const line = (over: Partial<Line> & Pick<Line, "productId">): Line => ({ name: over.productId, price: 100, quantity: 1, ...over });
  const catalog = new Map<string, Variant[] | null>([
    ["serum", [valid({ id: "30-ml", label: "30 ml", price: 499, mrp: 600 }), valid({ id: "15-ml", label: "15 ml", price: 299, mrp: 350 })]],
    ["soap", null],
  ]);

  test("an old line for a product with variants moves to its default variant, and is not lost", () => {
    const out = migrateCartLines({ serum: line({ productId: "serum", price: 999, quantity: 2 }) }, catalog);
    const items = Object.values(out);
    assert.equal(items.length, 1);
    assert.equal(items[0].variantId, "30-ml");
    assert.equal(items[0].variantLabel, "30 ml");
    assert.equal(items[0].price, 499);
    assert.equal(items[0].quantity, 2);
    assert.ok(out["serum::30-ml"]);
  });

  test("an old line for a product without variants keeps its single price", () => {
    const out = migrateCartLines({ soap: line({ productId: "soap", price: 80 }) }, catalog);
    assert.equal(out.soap.variantId, null);
    assert.equal(out.soap.price, 80);
  });

  test("an old line for a product the catalogue does not list yet is kept exactly as it was", () => {
    const old = line({ productId: "later", price: 55 });
    const out = migrateCartLines({ later: old }, catalog);
    assert.equal(out.later.variantId, undefined);
    assert.equal(out.later.price, 55);
  });

  test("a variant line gets the current label and price, and a removed variant is left for checkout to report", () => {
    const out = migrateCartLines(
      {
        "serum::30-ml": line({ productId: "serum", variantId: "30-ml", variantLabel: "30 ML old", price: 450 }),
        "serum::1-l": line({ productId: "serum", variantId: "1-l", variantLabel: "1 L", price: 900 }),
      },
      catalog,
    );
    assert.equal(out["serum::30-ml"].price, 499);
    assert.equal(out["serum::30-ml"].variantLabel, "30 ml");
    assert.equal(out["serum::1-l"].price, 900, "left as it was");
  });

  test("lines that land on the same key are merged by quantity", () => {
    const out = migrateCartLines(
      { serum: line({ productId: "serum", quantity: 1 }), "serum::30-ml": line({ productId: "serum", variantId: "30-ml", quantity: 2 }) },
      catalog,
    );
    assert.equal(Object.keys(out).length, 1);
    assert.equal(out["serum::30-ml"].quantity, 3);
  });

  test("without a catalogue only the shape is kept: keys do not change", () => {
    const out = migrateCartLines({ soap: line({ productId: "soap" }), "serum::15-ml": line({ productId: "serum", variantId: "15-ml" }) });
    assert.deepEqual(Object.keys(out).sort(), ["serum::15-ml", "soap"]);
  });

  test("a line still counts as sold when its product, and its variant, still exist", () => {
    const serum = { variants: [valid({ id: "30-ml" })] };
    assert.equal(lineStillSold({ productId: "serum", variantId: "30-ml" }, serum), true);
    assert.equal(lineStillSold({ productId: "serum", variantId: "1-l" }, serum), false);
    assert.equal(lineStillSold({ productId: "soap", variantId: null }, { variants: null }), true);
    assert.equal(lineStillSold({ productId: "soap", variantId: "30-ml" }, { variants: null }), false);
    assert.equal(lineStillSold({ productId: "gone", variantId: null }, undefined), false);
  });
});

describe("setVariants (admin helper)", () => {
  const seeded = () => new FakeStore({ "products/serum": { status: "PUBLISHED", productName: "Serum", brandPrice: 999 } });

  test("saves a valid list and records who changed it", async () => {
    const store = seeded();
    const out = await setVariants("serum", [v({ id: "30-ml", label: "30 ml" })], "admin@glowvai.in", asFirestore(store));
    assert.deepEqual(out, { ok: true, count: 1 });
    const saved = store.product("serum");
    assert.equal((saved.variants as Variant[])[0].id, "30-ml");
    assert.equal(saved.variantsUpdatedBy, "admin@glowvai.in");
    assert.equal(saved.productName, "Serum", "other fields are kept");
  });

  test("an invalid list is refused and nothing is written", async () => {
    const store = seeded();
    const out = await setVariants("serum", [v({ id: "BAD" })], "admin", asFirestore(store));
    assert.equal(out.ok, false);
    assert.equal(store.product("serum").variants, undefined);
  });

  test("a missing product, a bad product id or an empty actor are refused", async () => {
    const store = seeded();
    assert.equal((await setVariants("nope", [], "admin", asFirestore(store))).ok, false);
    assert.equal((await setVariants("a/b", [], "admin", asFirestore(store))).ok, false);
    assert.equal((await setVariants("serum", [], "  ", asFirestore(store))).ok, false);
  });

  test("an empty list clears the variants", async () => {
    const store = new FakeStore({ "products/serum": { status: "PUBLISHED", variants: [v({ id: "a" })] } });
    assert.deepEqual(await setVariants("serum", [], "admin", asFirestore(store)), { ok: true, count: 0 });
    assert.deepEqual(store.product("serum").variants, []);
    assert.deepEqual(readProductVariants(store.product("serum").variants), { ok: true, variants: null });
  });
});
