import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { substitutionForVendor, SUBSTITUTION_VENDOR_COPY, orderTimeline } from "../../lib/vendor/vendorView";
import { toVendorOrder } from "../../lib/vendor/orders";

const T0 = Date.parse("2026-11-07T04:00:00Z");

describe("substitution preference on the pack screen", () => {
  test("each stored value maps to the packer's copy, read-only", () => {
    const allow = substitutionForVendor("ALLOW_SUBSTITUTE");
    const none = substitutionForVendor("NO_SUBSTITUTE");
    const call = substitutionForVendor("CALL_ME");
    assert.equal(allow?.label, "Allow a similar substitute");
    assert.equal(none?.label, "Do not substitute");
    assert.equal(call?.label, "Call me before any change");
    assert.equal(allow?.tone, "ok");
    assert.equal(none?.tone, "warn");
    assert.equal(call?.tone, "info");
    for (const v of [allow, none, call]) assert.equal(v?.canChange, false);
  });

  test("a missing, unknown or differently cased value shows nothing rather than a guess", () => {
    assert.equal(substitutionForVendor(undefined), null);
    assert.equal(substitutionForVendor(null), null);
    assert.equal(substitutionForVendor("allow_substitute"), null);
    assert.equal(substitutionForVendor("ANY"), null);
    assert.equal(substitutionForVendor(3), null);
  });

  test("every preference has packer copy", () => {
    assert.equal(Object.keys(SUBSTITUTION_VENDOR_COPY).length, 3);
    for (const c of Object.values(SUBSTITUTION_VENDOR_COPY)) assert.ok(c.hint.length > 10);
  });

  test("the order view carries the preference as read-only data, and offers carry none", () => {
    const order = { orderId: "GV-9", vendorUid: "u1", status: "VENDOR_ACCEPTED", substitutionPreference: "CALL_ME", items: [], createdAt: T0 };
    assert.equal(toVendorOrder(order, { uid: "u1", isOffer: false, orderId: "GV-9" }).substitutionPreference, "CALL_ME");
    assert.equal(toVendorOrder({ ...order, substitutionPreference: "BOGUS" }, { uid: "u1", isOffer: false }).substitutionPreference, null);
  });
});

describe("order timeline", () => {
  test("only recorded milestones appear, with their times and fixed labels", () => {
    const steps = orderTimeline({ status: "VENDOR_ACCEPTED", vendorAcceptedAt: T0 + 60_000 });
    assert.deepEqual(steps, [{ at: T0 + 60_000, label: "Accepted" }]);
  });

  test("packed follows accepted", () => {
    const steps = orderTimeline({ status: "PACKED", vendorAcceptedAt: T0, vendorPackedAt: T0 + 600_000 });
    assert.deepEqual(steps, [
      { at: T0, label: "Accepted" },
      { at: T0 + 600_000, label: "Packed" },
    ]);
  });

  test("handed to the delivery partner uses the order's own outForDeliveryAt, and event text is never read", () => {
    const steps = orderTimeline({
      status: "OUT_FOR_DELIVERY",
      vendorAcceptedAt: T0,
      vendorPackedAt: T0 + 1000,
      outForDeliveryAt: T0 + 3000,
      events: [
        { at: T0 + 2000, actor: "Customer", event: "Order placed" },
        { at: T0 + 2500, actor: "Delivery partner Ravi 9876543210", event: "Out for delivery" },
      ],
    });
    assert.deepEqual(steps.map((s) => s.label), ["Accepted", "Packed", "Handed to delivery partner"]);
    assert.equal(steps[2].at, T0 + 3000);
    const serialised = JSON.stringify(steps);
    assert.equal(serialised.includes("Ravi"), false);
    assert.equal(serialised.includes("9876543210"), false);
    assert.equal(serialised.includes("Out for delivery"), false);
    assert.equal(serialised.includes("Customer"), false);
  });

  test("a milestone with no recorded time is left out, not shown with a made-up time", () => {
    const steps = orderTimeline({ status: "DELIVERED", vendorAcceptedAt: T0, events: [] });
    assert.deepEqual(steps, [{ at: T0, label: "Accepted" }]);
  });

  test("an order with no milestones has an empty timeline", () => {
    assert.deepEqual(orderTimeline({ status: "CANCELLED" }), []);
    assert.deepEqual(orderTimeline({ status: "PLACED", vendorAcceptedAt: 0, vendorPackedAt: "soon" }), []);
  });

  test("offers have no timeline (the store has not accepted them)", () => {
    const v = toVendorOrder({ orderId: "GV-2", status: "PLACED", vendorAcceptedAt: T0, items: [], createdAt: T0 }, { uid: "u1", isOffer: true, orderId: "GV-2" });
    assert.deepEqual(v.timeline, []);
  });
});
