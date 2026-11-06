import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseSubstitutionPreference, preferenceChangeBlock } from "../../lib/shop/preferences";
import { maskPhone, scrubContact, statusText, trackingView } from "../../lib/shop/tracking";
import type { Doc } from "../../lib/shop/orderState";

const T0 = Date.UTC(2026, 10, 2, 9, 0);

const placed = (extra: Doc = {}): Doc => ({
  orderId: "GV-261102-AAAAAA",
  userId: "uid-1",
  status: "PLACED",
  createdAt: T0,
  vendorId: "vendor-9",
  vendorUid: "vendor-uid-secret",
  stockReservation: { vendorUid: "vendor-uid-secret", items: [{ productId: "p", quantity: 1 }] },
  transactionId: "COD-SECRET",
  trackingId: "TRK-SECRET",
  razorpayOrderId: "order_secret",
  customerPhone: "9876543210",
  items: [{ productId: "p-serum", productName: "Serum", brand: "Acme", quantity: 1, unitPrice: 500, imageUrl: "x" }],
  shippingAddress: { recipientName: "Asha", phoneNumber: "9876543210", fullAddress: "12 Main Road", city: "Vijayawada", pincode: "520001", landmark: "Near park" },
  events: [
    { at: T0, actor: "Customer", event: "Order placed (cash on delivery)" },
    { at: T0 + 60_000, actor: "Vendor Secret Store", event: "Store accepted, call +91 98765 43210 for pickup" },
  ],
  ...extra,
});

describe("tracking: projection", () => {
  test("no internal fields leave the server", () => {
    const view = trackingView(placed(), null, "GV-261102-AAAAAA");
    const text = JSON.stringify(view);
    for (const secret of ["vendor-9", "vendor-uid-secret", "COD-SECRET", "TRK-SECRET", "order_secret", "Vendor Secret Store", "stockReservation", "uid-1", "9876543210"]) {
      assert.equal(text.includes(secret), false, `leaked ${secret}`);
    }
  });

  test("event text with a phone number is masked", () => {
    const view = trackingView(placed(), null, "GV-261102-AAAAAA");
    const labels = view.timeline.map((t) => t.label);
    assert.equal(labels[1].includes("98765"), false);
    assert.match(labels[1], /•••/);
  });

  test("the customer's own address is shown, without the phone number", () => {
    const view = trackingView(placed(), null, "GV-261102-AAAAAA");
    assert.deepEqual(view.address, { recipientName: "Asha", fullAddress: "12 Main Road", city: "Vijayawada", pincode: "520001", landmark: "Near park" });
  });

  test("the store-side status text follows the status", () => {
    assert.match(trackingView(placed(), null, "x").statusText, /Waiting for a GlowVai partner store/);
    assert.match(trackingView(placed({ status: "PACKED" }), null, "x").statusText, /waiting for pickup/);
    assert.equal(statusText("NOT_A_STATUS"), "The GlowVai team is working on this order.");
  });

  test("the admin's cancellation overrides the shop status", () => {
    const view = trackingView(placed({ status: "VENDOR_ACCEPTED" }), { fulfilment: "CANCELLED" }, "x");
    assert.equal(view.status, "CANCELLED");
    assert.equal(view.substitutionPreference.canChange, false);
    assert.equal(view.returnWindowEndsAt, null);
  });

  test("a delivered order has a return window end and no expected window", () => {
    const delivered = T0 + 86_400_000;
    const view = trackingView(placed({ status: "DELIVERED", deliveredAt: delivered }), null, "x");
    assert.equal(view.deliveredAt, delivered);
    assert.equal(view.returnWindowEndsAt, delivered + 7 * 86_400_000);
    assert.equal(view.expectedWindow, null);
  });
});

describe("tracking: expected window", () => {
  test("no estimate is made up when the order carries no slot", () => {
    assert.equal(trackingView(placed(), null, "x").expectedWindow, null);
  });

  test("the slot stored on the order is shown while the order is open", () => {
    const from = T0 + 3_600_000;
    const to = T0 + 7_200_000;
    assert.deepEqual(trackingView(placed({ deliverySlot: { from, to } }), null, "x").expectedWindow, { from, to });
    assert.equal(trackingView(placed({ deliverySlot: { from: to, to: from } }), null, "x").expectedWindow, null);
  });
});

describe("tracking: rider and live location", () => {
  test("no rider is shown when the order carries none", () => {
    assert.equal(trackingView(placed(), null, "x").rider, null);
  });

  test("a rider name and a masked phone are shown when the order carries them", () => {
    const view = trackingView(placed({ rider: { name: "Ravi", phone: "+91 98111 22233" } }), null, "x");
    assert.equal(view.rider?.name, "Ravi");
    assert.equal(view.rider?.phone?.display, "+91 •••••• 2233");
    assert.equal(view.rider?.phone?.tel, "+919811122233");
  });

  test("a partial rider phone is masked and never callable", () => {
    const phone = maskPhone("12345");
    assert.deepEqual(phone, { display: "•••••• 2345", tel: null });
    assert.equal(maskPhone("98"), null);
  });

  test("a full number that is not a valid Indian mobile is not callable", () => {
    assert.deepEqual(maskPhone("1234567890"), { display: "•••••• 7890", tel: null });
  });

  test("live location is never faked", () => {
    const view = trackingView(placed({ status: "DISPATCHED", rider: { name: "Ravi" } }), null, "x");
    assert.equal(view.liveLocation.available, false);
    assert.match(view.liveLocation.note, /Live location is not available yet/);
    assert.equal(/"lat"|latitude|longitude/.test(JSON.stringify(view)), false);
  });
});

describe("tracking: scrubbing", () => {
  test("emails and phone numbers are masked in free text", () => {
    assert.equal(scrubContact("mail asha@example.com now"), "mail ••• now");
    assert.equal(scrubContact("call +91 98765 43210"), "call •••");
  });
});

describe("substitution preference: values", () => {
  test("only the three enum values are accepted", () => {
    assert.equal(parseSubstitutionPreference("ALLOW_SUBSTITUTE"), "ALLOW_SUBSTITUTE");
    assert.equal(parseSubstitutionPreference("NO_SUBSTITUTE"), "NO_SUBSTITUTE");
    assert.equal(parseSubstitutionPreference("CALL_ME"), "CALL_ME");
    assert.equal(parseSubstitutionPreference("allow_substitute"), null);
    assert.equal(parseSubstitutionPreference(undefined), null);
    assert.equal(parseSubstitutionPreference(["CALL_ME"]), null);
  });
});

describe("substitution preference: change rules", () => {
  test("changeable while placed, accepted or awaiting payment", () => {
    assert.equal(preferenceChangeBlock(placed(), null).ok, true);
    assert.equal(preferenceChangeBlock(placed({ status: "VENDOR_ACCEPTED" }), { fulfilment: "CREATED" }).ok, true);
    assert.equal(preferenceChangeBlock(placed({ status: "PAYMENT_PENDING" }), null).ok, true);
  });

  test("blocked once packed, or after the store or GlowVai team has moved on", () => {
    const packed = preferenceChangeBlock(placed({ status: "PACKED" }), null);
    assert.equal(packed.ok, false);
    if (!packed.ok) {
      assert.equal(packed.status, 409);
      assert.match(packed.error, /packed/);
    }
    assert.equal(preferenceChangeBlock(placed({ status: "PACKED" }), null).ok, false);
    assert.equal(preferenceChangeBlock(placed({ status: "VENDOR_ACCEPTED" }), { fulfilment: "PACKING" }).ok, false);
    assert.equal(preferenceChangeBlock(placed({ status: "DELIVERED", deliveredAt: T0 }), null).ok, false);
  });

  test("blocked for cancelled orders", () => {
    assert.equal(preferenceChangeBlock(placed({ status: "CANCELLED" }), null).ok, false);
    assert.equal(preferenceChangeBlock(placed(), { fulfilment: "CANCELLED" }).ok, false);
  });

  test("the view says when a change is blocked and why", () => {
    const view = trackingView(placed({ status: "PACKED", substitutionPreference: "CALL_ME" }), null, "x");
    assert.deepEqual(
      { value: view.substitutionPreference.value, canChange: view.substitutionPreference.canChange, label: view.substitutionPreference.label },
      { value: "CALL_ME", canChange: false, label: "Call me before any change" },
    );
    assert.ok(view.substitutionPreference.changeBlockedReason);
  });
});
