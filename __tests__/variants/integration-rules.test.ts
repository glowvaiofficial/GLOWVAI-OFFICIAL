import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseDeliveryAddress, parseOrderRequest } from "../../lib/shop/orderRequest";
import { splitReorder, type CatalogView } from "../../lib/shop/reorder";
import { lineKeyOf } from "../../lib/shop/variants";

const address = { name: "Asha Rao", phone: "9876543210", fullAddress: "12 Lake View Road", city: "Hyderabad", pincode: "500001" };

describe("pincode is refused, never shortened", () => {
  test("a 7-digit pincode is refused with the usual message", () => {
    const r = parseDeliveryAddress({ ...address, pincode: "5000012" });
    assert.equal(r.ok === false && r.error, "Enter a 6-digit pincode.");
  });

  test("a 6-digit pincode is accepted", () => {
    assert.equal(parseDeliveryAddress(address).ok, true);
  });

  test("the order request refuses a 7-digit pincode too", () => {
    const r = parseOrderRequest({ items: [{ productId: "p1", quantity: 1 }], address: { ...address, pincode: "5000012" } }, { onlineAvailable: false });
    assert.equal(r.ok === false && r.error, "Enter a 6-digit pincode.");
  });
});

describe("order request: a saved address is taken by id", () => {
  test("with an addressId, the typed address is not checked", () => {
    const r = parseOrderRequest({ items: [{ productId: "p1", quantity: 1 }], addressId: "adr_0123456789abcdef", address: {} }, { onlineAvailable: false });
    assert.equal(r.ok && r.value.addressId, "adr_0123456789abcdef");
    assert.equal(r.ok && r.value.address, null);
  });
});

describe("buy again keeps the variant the customer bought", () => {
  const view = (productId: string, variantId: string | null, unitPrice: number, stock: number | null): CatalogView => ({
    productId,
    name: "Serum",
    brand: "Brand",
    imageUrl: "",
    published: true,
    unitPrice,
    originalPrice: unitPrice,
    stock,
    variantId,
    variantLabel: variantId ? `Size ${variantId}` : null,
  });

  test("a variant line is priced from its own variant and keyed by product and variant", () => {
    const catalog = new Map<string, CatalogView | null>([[lineKeyOf("p1", "30ml"), view("p1", "30ml", 450, 4)]]);
    const r = splitReorder([{ productId: "p1", variantId: "30ml", quantity: 2 }], catalog);
    assert.equal(r.available.length, 1);
    assert.equal(r.available[0].variantId, "30ml");
    assert.equal(r.available[0].unitPrice, 450);
    assert.equal(r.available[0].quantity, 2);
  });

  test("a variant that is no longer in the catalogue is listed as not available, not added as a plain product", () => {
    const catalog = new Map<string, CatalogView | null>([[lineKeyOf("p1", "50ml"), null]]);
    const r = splitReorder([{ productId: "p1", variantId: "50ml", quantity: 1 }], catalog);
    assert.equal(r.available.length, 0);
    assert.equal(r.unavailable[0].reason, "NOT_AVAILABLE");
    assert.equal(r.unavailable[0].variantId, "50ml");
  });
});
