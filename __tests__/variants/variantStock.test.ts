// Transaction-level checks for variant stock: the order transaction, cancel, failed payment and retake, run against an
// in-memory store that stages writes and drops them when a transaction throws (see fakeStore.ts).
import { register } from "node:module";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { planRelease } from "../../lib/shop/platformStock";
import { orderReservationFor, planOrderStock, planVariantRelease, reservedProductIds, type OrderStockLine, type StockProduct, type Variant } from "../../lib/shop/variants";
import { FakeStore, asFirestore } from "./fakeStore";

// platformStockTx imports "server-only", which only works inside a server build. The stub lets the test load it.
register("./server-only-stub.mjs", import.meta.url);
const stock = await import("../../lib/shop/platformStockTx");
const variantStock = await import("../../lib/shop/variantStockTx");
const { readProductStock, writeStockChanges, releaseStockTx, retakeStockTx } = stock;
const { writeVariantStockChanges } = variantStock;

const NOW = 1_700_000_000_000;

const variant = (over: Partial<Variant> & { id: string }): Variant => ({ label: over.id, price: 300, mrp: 600, stock: 5, isAvailable: true, ...over });

function shop(): FakeStore {
  const serum: StockProduct & { variants: Variant[] } = {
    status: "PUBLISHED",
    productName: "Vitamin C Serum",
    brandPrice: 999,
    stock: 50,
    variants: [variant({ id: "30-ml", label: "30 ml", price: 499, stock: 3 }), variant({ id: "15-ml", label: "15 ml", price: 299, stock: 4 })],
  };
  return new FakeStore({
    "products/serum": serum as unknown as Record<string, unknown>,
    "products/soap": { status: "PUBLISHED", productName: "Soap", brandPrice: 80, stock: 10 },
    "products/plain-tee": { status: "PUBLISHED", productName: "Tee", brandPrice: 200 },
  });
}

const fs = (store: FakeStore) => asFirestore(store);

// The order transaction as app/api/shop/orders/route.ts runs it: read, plan, then write.
async function placeOrder(store: FakeStore, lines: OrderStockLine[]) {
  return store.runTransaction(async (tx) => {
    const fresh = await readProductStock(tx, fs(store), [...new Set(lines.map((l) => l.productId))]);
    const plan = planOrderStock(lines, fresh);
    if (!plan.ok) throw new Error(plan.message);
    writeStockChanges(tx, fs(store), plan.decrements, NOW);
    writeVariantStockChanges(tx, fs(store), plan.variantWrites, NOW);
    return orderReservationFor(plan);
  });
}

// The cancel route's transaction: one read of every product in the reservation, then the writes.
async function cancelLikeRoute(store: FakeStore, reservation: unknown): Promise<void> {
  await store.runTransaction(async (tx) => {
    const products = await readProductStock(tx, fs(store), reservedProductIds(reservation));
    writeStockChanges(tx, fs(store), planRelease(reservation, products), NOW);
    writeVariantStockChanges(tx, fs(store), planVariantRelease(reservation, products), NOW);
  });
}

const variantStockOf = (store: FakeStore, productId: string, variantId: string) =>
  (((store.product(productId).variants as Variant[]) ?? []).find((v) => v.id === variantId) ?? { stock: undefined }).stock;

describe("order transaction: variant lines", () => {
  test("a variant line decrements the variant and leaves the product stock alone", async () => {
    const store = shop();
    await placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 2 }]);
    assert.equal(variantStockOf(store, "serum", "30-ml"), 1);
    assert.equal(variantStockOf(store, "serum", "15-ml"), 4, "the other size is untouched");
    assert.equal(store.product("serum").stock, 50, "product stock is not decremented for a variant line");
  });

  test("a mixed order decrements each line in its own stock domain", async () => {
    const store = shop();
    const reservation = await placeOrder(store, [
      { productId: "serum", variantId: "15-ml", quantity: 1 },
      { productId: "soap", variantId: null, quantity: 3 },
    ]);
    assert.equal(variantStockOf(store, "serum", "15-ml"), 3);
    assert.equal(store.product("serum").stock, 50);
    assert.equal(store.product("soap").stock, 7);
    assert.deepEqual(reservation.variants, [{ productId: "serum", variantId: "15-ml", quantity: 1 }]);
    assert.deepEqual(reservation.platform, [{ productId: "soap", quantity: 3 }]);
  });

  test("two sizes of one product in one order are two stock movements in one write", async () => {
    const store = shop();
    await placeOrder(store, [
      { productId: "serum", variantId: "30-ml", quantity: 1 },
      { productId: "serum", variantId: "15-ml", quantity: 4 },
    ]);
    assert.equal(variantStockOf(store, "serum", "30-ml"), 2);
    assert.equal(variantStockOf(store, "serum", "15-ml"), 0);
  });

  test("an order that fails on one line writes nothing: every stock value is unchanged", async () => {
    const store = shop();
    const before = structuredClone(store.docs);
    await assert.rejects(
      placeOrder(store, [
        { productId: "soap", variantId: null, quantity: 1 },
        { productId: "serum", variantId: "30-ml", quantity: 1 },
        { productId: "serum", variantId: "15-ml", quantity: 9 },
      ]),
      /Only 4 of Vitamin C Serum \(15 ml\) left/,
    );
    assert.deepEqual(store.docs, before);
  });

  test("a sold-out variant blocks the order with a message that names the option", async () => {
    const store = shop();
    await placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 3 }]);
    await assert.rejects(placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 1 }]), /30 ml\) is sold out/);
    assert.equal(variantStockOf(store, "serum", "30-ml"), 0);
  });

  test("no double decrement: a variant line never touches product stock, a product line never touches variants", async () => {
    const store = shop();
    const variantsBefore = structuredClone(store.product("serum").variants);
    await placeOrder(store, [{ productId: "soap", variantId: null, quantity: 2 }]);
    assert.deepEqual(store.product("serum").variants, variantsBefore, "variants untouched by a product line");
    assert.equal(store.product("soap").stock, 8);

    await placeOrder(store, [{ productId: "serum", variantId: "15-ml", quantity: 1 }]);
    assert.equal(store.product("serum").stock, 50, "product stock untouched by a variant line");
    assert.equal(store.product("soap").stock, 8, "soap untouched by the serum line");
  });

  test("a product with variants refuses a line without a variant, so it never falls back to product stock", async () => {
    const store = shop();
    await assert.rejects(placeOrder(store, [{ productId: "serum", variantId: null, quantity: 1 }]), /Choose an option/);
    assert.equal(store.product("serum").stock, 50);
  });
});

describe("cancel and payment paths restore the same variant", () => {
  test("cancel gives the variant stock back, and only once", async () => {
    const store = shop();
    const reservation = await placeOrder(store, [
      { productId: "serum", variantId: "30-ml", quantity: 2 },
      { productId: "soap", variantId: null, quantity: 1 },
    ]);
    await cancelLikeRoute(store, reservation);
    assert.equal(variantStockOf(store, "serum", "30-ml"), 3);
    assert.equal(variantStockOf(store, "serum", "15-ml"), 4);
    assert.equal(store.product("soap").stock, 10);
    assert.equal(store.product("serum").stock, 50);

    // The reservation is marked released by the cancel route; a second release changes nothing.
    await cancelLikeRoute(store, { ...reservation, releasedAt: NOW });
    assert.equal(variantStockOf(store, "serum", "30-ml"), 3);
    assert.equal(store.product("soap").stock, 10);
  });

  test("a failed payment releases variant stock once, even if the webhook fires twice", async () => {
    const store = shop();
    const reservation = await placeOrder(store, [{ productId: "serum", variantId: "15-ml", quantity: 2 }]);
    const first = await store.runTransaction((tx) => releaseStockTx(tx, fs(store), reservation, NOW));
    assert.deepEqual(first.patch, { "stockReservation.releasedAt": NOW });
    assert.equal(variantStockOf(store, "serum", "15-ml"), 4);

    const second = await store.runTransaction((tx) => releaseStockTx(tx, fs(store), { ...reservation, releasedAt: NOW }, NOW + 1));
    assert.deepEqual(second.patch, {});
    assert.equal(variantStockOf(store, "serum", "15-ml"), 4);
  });

  test("a payment confirmed after its release takes the same variant again", async () => {
    const store = shop();
    const reservation = await placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 2 }]);
    await store.runTransaction((tx) => releaseStockTx(tx, fs(store), reservation, NOW));
    assert.equal(variantStockOf(store, "serum", "30-ml"), 3);

    const released = { ...reservation, releasedAt: NOW };
    const out = await store.runTransaction((tx) => retakeStockTx(tx, fs(store), released, NOW + 2));
    assert.equal(out.shortNote, null);
    assert.deepEqual(out.patch, { "stockReservation.releasedAt": null });
    assert.equal(variantStockOf(store, "serum", "30-ml"), 1);
  });

  test("a retake that finds the variant sold out clamps at zero and tells the admin which option is short", async () => {
    const store = shop();
    const reservation = await placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 2 }]);
    await store.runTransaction((tx) => releaseStockTx(tx, fs(store), reservation, NOW));
    // Another customer buys the freed stock while the first payment is pending.
    await placeOrder(store, [{ productId: "serum", variantId: "30-ml", quantity: 3 }]);
    const out = await store.runTransaction((tx) => retakeStockTx(tx, fs(store), { ...reservation, releasedAt: NOW }, NOW + 2));
    assert.equal(variantStockOf(store, "serum", "30-ml"), 0, "never below zero");
    assert.match(out.shortNote ?? "", /Vitamin C Serum \(30-ml\)|30 ml/);
    assert.match(out.shortNote ?? "", /Review before dispatch/);
  });

  test("an order placed before variants existed still restores product stock exactly as before", async () => {
    const store = shop();
    const legacy = { platform: [{ productId: "soap", quantity: 4 }], releasedAt: null };
    await store.runTransaction(async (tx) => {
      const products = await readProductStock(tx, fs(store), reservedProductIds(legacy));
      writeStockChanges(tx, fs(store), planRelease(legacy, products), NOW);
    });
    assert.equal(store.product("soap").stock, 14);
  });
});
