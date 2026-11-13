import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { firstName, missingStock, offerBlock, scrubContact, toVendorOrder, uncheckedItems, OFFER_FRESHNESS_MS } from "../../lib/vendor/orders";
import type { OperatingVendor } from "../../lib/vendor/state";

const NOW = 1_762_400_000_000;

// An order exactly as the shop writes it (app/api/shop/orders/route.ts), with every private field filled in.
const shopOrder = (extra: Record<string, unknown> = {}) => ({
  orderId: "GV-261106-ABC123",
  transactionId: "COD-1A2B3C4D",
  razorpayOrderId: "order_secret",
  trackingId: "TRK-9F8E7D6C",
  userId: "customer-uid-1",
  customerName: "Priya Sharma",
  customerPhone: "9876543210",
  customerEmail: "priya@example.com",
  deliveryType: "STANDARD",
  vendorId: null,
  vendorName: null,
  vendorStatus: "PENDING",
  zoneId: null,
  items: [
    { productId: "p1", sku: "p1", title: "Serum", productName: "Vitamin C Serum", brand: "Minimalist", unitPrice: 599, quantity: 2, totalPrice: 1198, imageUrl: "https://x/p1.jpg" },
    { productId: "p2", sku: "p2", title: "Sunscreen", productName: "SPF 50 Sunscreen", brand: "Dot & Key", unitPrice: 349, quantity: 1, totalPrice: 349, imageUrl: "" },
  ],
  shippingAddress: {
    label: "Home",
    recipientName: "Priya Sharma",
    phoneNumber: "9876543210",
    streetAddress: "Flat 4B, Rose Apartments",
    fullAddress: "Flat 4B, Rose Apartments, 5th Cross",
    city: "Bengaluru",
    pincode: "560038",
    landmark: "Near the temple",
    area: "Indiranagar",
    coordinates: { latitude: 12.97, longitude: 77.64 },
    isDefault: true,
  },
  pricing: { subtotal: 1547, grandTotal: 1587 },
  payment: { method: "COD", status: "PENDING", transactionId: "COD-1A2B3C4D", paymentId: "pay_secret" },
  status: "PLACED",
  couponCode: null,
  source: "web_shop",
  events: [{ at: NOW - 60_000, actor: "Customer", event: "Order placed (cash on delivery)" }],
  createdAt: NOW - 60_000,
  updatedAt: NOW - 60_000,
  ...extra,
});

const vendor = (extra: Partial<OperatingVendor> = {}): OperatingVendor => ({
  uid: "v1",
  applicationId: "VAPP-v1",
  storeName: "Glow Pharmacy",
  canOperate: true,
  approved: true,
  isOnline: true,
  lastSeenAt: NOW - 30_000,
  servicePincodes: ["560038", "560008"],
  ...extra,
});

const accepted = (extra: Record<string, unknown> = {}) =>
  shopOrder({
    vendorId: "VAPP-v1",
    vendorUid: "v1",
    vendorName: "Glow Pharmacy",
    vendorStatus: "ACCEPTED",
    status: "VENDOR_ACCEPTED",
    vendorAcceptedAt: NOW,
    stockReservation: { vendorUid: "v1", items: [{ productId: "p1", quantity: 2 }] },
    ...extra,
  });

// Every key and value that must never reach a vendor.
const FORBIDDEN_KEYS = [
  "customerPhone", "phoneNumber", "phone", "shippingAddress", "address", "fullAddress", "streetAddress", "landmark", "coordinates",
  "latitude", "longitude", "email", "customerEmail", "userId", "transactionId", "razorpayOrderId", "paymentId", "payment", "trackingId",
  "pricing", "events", "stockReservation", "dispatch", "customerName", "recipientName", "area", "city", "pincode",
];
const FORBIDDEN_VALUES = ["9876543210", "Rose Apartments", "temple", "priya@example.com", "customer-uid-1", "COD-1A2B3C4D", "order_secret", "pay_secret", "TRK-9F8E7D6C", "Sharma", "12.97", "560038", "Indiranagar"];

function keysDeep(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) (out.push(k), keysDeep(x, out));
  return out;
}

function assertPrivate(projected: unknown) {
  const keys = keysDeep(projected);
  for (const k of FORBIDDEN_KEYS) assert.ok(!keys.includes(k), `projection leaks key ${k}`);
  const text = JSON.stringify(projected);
  for (const v of FORBIDDEN_VALUES) assert.ok(!text.includes(v), `projection leaks value ${v}`);
}

describe("offer eligibility", () => {
  test("an eligible vendor sees a placed, unassigned order in their pincodes", () => {
    assert.equal(offerBlock(shopOrder(), vendor(), NOW), null);
  });

  test("each rule blocks the offer", () => {
    assert.equal(offerBlock(shopOrder({ status: "PAYMENT_PENDING" }), vendor(), NOW), "NOT_PLACED");
    assert.equal(offerBlock(shopOrder({ vendorId: "VAPP-v2" }), vendor(), NOW), "ASSIGNED");
    assert.equal(offerBlock(shopOrder({ vendorUid: "v2" }), vendor(), NOW), "ASSIGNED");
    assert.equal(offerBlock(shopOrder(), vendor({ canOperate: false }), NOW), "NOT_OPERATING");
    assert.equal(offerBlock(shopOrder(), vendor({ isOnline: false }), NOW), "OFFLINE");
    assert.equal(offerBlock(shopOrder(), vendor({ lastSeenAt: NOW - OFFER_FRESHNESS_MS - 1 }), NOW), "STALE");
    assert.equal(offerBlock(shopOrder(), vendor({ lastSeenAt: null }), NOW), "STALE");
    assert.equal(offerBlock(shopOrder(), vendor({ servicePincodes: ["110001"] }), NOW), "PINCODE");
    assert.equal(offerBlock(shopOrder({ dispatch: { declinedBy: ["v1"] } }), vendor(), NOW), "DECLINED");
    assert.equal(offerBlock(shopOrder({ dispatch: { declinedBy: ["v2"] } }), vendor(), NOW), null);
  });

  test("accept ignores freshness but nothing else", () => {
    assert.equal(offerBlock(shopOrder(), vendor({ lastSeenAt: null }), NOW, { ignoreFreshness: true }), null);
    assert.equal(offerBlock(shopOrder(), vendor({ lastSeenAt: null, isOnline: false }), NOW, { ignoreFreshness: true }), "OFFLINE");
  });
});

describe("VendorOrder projection privacy", () => {
  test("an offer carries only reference, items, value and times", () => {
    const p = toVendorOrder(shopOrder(), { uid: "v1", isOffer: true });
    assertPrivate(p);
    assert.deepEqual(Object.keys(p).sort(), ["cancelled", "isOffer", "itemCount", "items", "itemsValue", "orderId", "placedAt", "reference", "status", "substitutionPreference", "timeline", "updatedAt", "vendorStatus"].sort());
    assert.equal(p.reference, "GV-261106-ABC123");
    assert.equal(p.isOffer, true);
    assert.equal(p.itemCount, 3);
    assert.equal(p.itemsValue, 599 * 2 + 349);
    assert.deepEqual(p.items[0], { productId: "p1", variantId: null, variantLabel: null, title: "Vitamin C Serum", brand: "Minimalist", quantity: 2, unitPrice: 599, imageUrl: "https://x/p1.jpg" });
    assert.equal(p.customerFirstName, undefined);
  });

  test("after this vendor accepts: first name only", () => {
    const p = toVendorOrder(accepted(), { uid: "v1", isOffer: false });
    assert.equal(p.customerFirstName, "Priya");
    assert.equal(p.acceptedAt, NOW);
    assert.equal(p.vendorStatus, "ACCEPTED");
    assertPrivate(p);
  });

  test("another vendor never gets the first name or this vendor's status", () => {
    const p = toVendorOrder(accepted(), { uid: "v2", isOffer: false });
    assert.equal(p.customerFirstName, undefined);
    assert.equal(p.vendorStatus, "PENDING");
    assert.equal(p.acceptedAt, undefined);
    assertPrivate(p);
  });

  test("packed and cancelled orders stay private; reasons are scrubbed of contact details", () => {
    assertPrivate(toVendorOrder(accepted({ status: "PACKED", vendorStatus: "PACKED", vendorPackedAt: NOW + 1 }), { uid: "v1", isOffer: false }));
    const c = toVendorOrder(accepted({ status: "CANCELLED", cancellationReason: "Call me on 98765 43210 or priya@example.com" }), { uid: "v1", isOffer: false });
    assert.equal(c.cancelled, true);
    assert.ok(c.cancellationReason && !c.cancellationReason.includes("98765") && !c.cancellationReason.includes("priya@"));
    // The first name is kept: the vendor accepted this order (only the redacted reason text is checked here).
    assert.ok(!JSON.stringify({ ...c, customerFirstName: undefined }).includes("9876543210"));
  });

  test("a staff cancellation in the admin overlay shows as cancelled", () => {
    const p = toVendorOrder(accepted(), { uid: "v1", isOffer: false, overlay: { fulfilment: "CANCELLED", cancellationReason: "Out of area" } });
    assert.equal(p.cancelled, true);
    assert.equal(p.status, "CANCELLED");
    assert.equal(p.cancellationReason, "Out of area");
  });

  test("first name is dropped when it looks like contact details", () => {
    assert.equal(firstName({ customerName: "9876543210" }), undefined);
    assert.equal(firstName({ customerName: "a@b.com Rao" }), undefined);
    assert.equal(firstName({ shippingAddress: { recipientName: "  Meera  K " } }), "Meera");
    assert.equal(scrubContact("ring +91 98765-43210"), "ring •••");
  });
});

describe("VendorOrder timeline", () => {
  test("lists the recorded milestones as {at, label} and leaks no event text, rider or staff details", () => {
    const p = toVendorOrder(
      accepted({
        status: "OUT_FOR_DELIVERY",
        vendorPackedAt: NOW + 1_000,
        outForDeliveryAt: NOW + 2_000,
        events: [{ at: NOW + 2_000, actor: "Rider Ravi 9876543210", event: "Out for delivery" }],
      }),
      { uid: "v1", isOffer: false },
    );
    assert.deepEqual(p.timeline, [
      { at: NOW, label: "Accepted" },
      { at: NOW + 1_000, label: "Packed" },
      { at: NOW + 2_000, label: "Handed to delivery partner" },
    ]);
    for (const entry of p.timeline) assert.deepEqual(Object.keys(entry).sort(), ["at", "label"]);
    assertPrivate(p);
    assert.equal(JSON.stringify(p.timeline).includes("Ravi"), false);
    assert.equal(JSON.stringify(p.timeline).includes("Out for delivery"), false);
  });

  test("an order with no recorded milestones has an empty timeline", () => {
    const p = toVendorOrder(shopOrder({ vendorId: "VAPP-v1", vendorUid: "v1", vendorStatus: "PENDING", status: "PLACED" }), { uid: "v1", isOffer: false });
    assert.deepEqual(p.timeline, []);
    assertPrivate(p);
  });
});

describe("stock and packing checks", () => {
  test("missingStock reports need and have per product", () => {
    const missing = missingStock(shopOrder(), [
      { productId: "p1", exists: true, stock: 1, isAvailable: true },
      { productId: "p2", exists: true, stock: 9, isAvailable: false },
    ]);
    assert.deepEqual(missing, [
      { productId: "p1", variantId: null, title: "Vitamin C Serum", need: 2, have: 1 },
      { productId: "p2", variantId: null, title: "SPF 50 Sunscreen", need: 1, have: 0 },
    ]);
    assert.deepEqual(missingStock(shopOrder(), [{ productId: "p1", exists: true, stock: 2, isAvailable: true }, { productId: "p2", exists: true, stock: 1, isAvailable: true }]), []);
    assert.equal(missingStock(shopOrder(), []).length, 2);
  });

  test("uncheckedItems requires every product", () => {
    assert.deepEqual(uncheckedItems(shopOrder(), ["p1"]), ["p2"]);
    assert.deepEqual(uncheckedItems(shopOrder(), ["p2", "p1", "extra"]), []);
  });
});
