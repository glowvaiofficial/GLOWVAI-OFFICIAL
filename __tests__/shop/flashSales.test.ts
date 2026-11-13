import { test } from "node:test";
import assert from "node:assert/strict";
import { liveSaleFor, priceFlashLine, readFlashSale, saleUnitPrice, type FlashSale } from "@/lib/shop/flashSales";

const NOW = 1_800_000_000_000;
const sale = (over: Partial<FlashSale> = {}): FlashSale => ({
  id: "sale-diwali-1", name: "Diwali flash", productIds: ["p1", "p2"], discountPercent: 20,
  startsAt: NOW - 1000, endsAt: NOW + 1000, stockCap: 10, perCustomerLimit: 2, enabled: true, ...over,
});

test("a sale is live only inside its window, switched on, and for its products", () => {
  assert.ok(liveSaleFor([sale()], "p1", NOW));
  assert.equal(liveSaleFor([sale()], "p9", NOW), null);
  assert.equal(liveSaleFor([sale({ enabled: false })], "p1", NOW), null);
  assert.equal(liveSaleFor([sale()], "p1", NOW + 1000), null);
  assert.equal(liveSaleFor([sale({ startsAt: NOW + 5 })], "p1", NOW), null);
});

test("the sale price is rounded down to whole rupees and never below 1", () => {
  assert.equal(saleUnitPrice(499, 20), 399);
  assert.equal(saleUnitPrice(1, 80), 1);
});

test("units within the sale limit get the sale price, the rest the normal price", () => {
  const r = priceFlashLine({ unitPrice: 500, quantity: 3, sale: sale({ stockCap: 10, perCustomerLimit: 5 }), soldSoFar: 9, customerSoFar: 0 });
  assert.equal(r.flashUnits, 1);
  assert.equal(r.totalPrice, 400 + 2 * 500);
});

test("when the sale is sold out, every unit is at the normal price", () => {
  const r = priceFlashLine({ unitPrice: 500, quantity: 2, sale: sale({ stockCap: 10 }), soldSoFar: 10, customerSoFar: 0 });
  assert.equal(r.flashUnits, 0);
  assert.equal(r.totalPrice, 1000);
  assert.equal(r.flashUnitPrice, null);
});

test("the per-customer limit caps what one customer can buy at the sale price", () => {
  const r = priceFlashLine({ unitPrice: 500, quantity: 4, sale: sale({ stockCap: null, perCustomerLimit: 2 }), soldSoFar: 0, customerSoFar: 1 });
  assert.equal(r.flashUnits, 1);
  assert.equal(r.totalPrice, 400 + 3 * 500);
});

test("no sale means the normal price", () => {
  const r = priceFlashLine({ unitPrice: 500, quantity: 2, sale: null, soldSoFar: 0, customerSoFar: 0 });
  assert.equal(r.totalPrice, 1000);
  assert.equal(r.flashUnits, 0);
});

test("stored sales are read strictly", () => {
  const ok = { name: "Diwali", productIds: ["p1"], discountPercent: 20, startsAt: NOW, endsAt: NOW + 10, stockCap: 5, perCustomerLimit: 1, enabled: true };
  assert.ok(readFlashSale("sale-diwali-1", ok));
  assert.equal(readFlashSale("BAD ID", ok), null);
  assert.equal(readFlashSale("sale-diwali-1", { ...ok, discountPercent: 90 }), null);
  assert.equal(readFlashSale("sale-diwali-1", { ...ok, endsAt: NOW }), null);
  assert.equal(readFlashSale("sale-diwali-1", { ...ok, stockCap: 0 }), null);
  assert.equal(readFlashSale("sale-diwali-1", { ...ok, productIds: [] }), null);
});
