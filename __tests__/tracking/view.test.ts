import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { delayBanner, liveTrackingView, type LiveTrackingInput } from "../../lib/shop/tracking";

const NOW = Date.UTC(2026, 10, 7, 12, 0);
const CUSTOMER = { lat: 16.5, lng: 80.6 };
const at = (km: number) => ({ lat: CUSTOMER.lat + km / 111.195, lng: CUSTOMER.lng, updatedAt: NOW });

function view(order: Record<string, unknown>, extra: Partial<LiveTrackingInput> = {}) {
  return liveTrackingView({
    order,
    overlay: null,
    orderId: "GV-260101-ABC123",
    now: NOW,
    rider: null,
    riderFirstName: null,
    store: null,
    storePhone: null,
    ...extra,
  });
}

describe("live tracking view", () => {
  test("a placed order shows stage 1 and no optional steps", () => {
    const v = view({ status: "PLACED", userId: "u" });
    assert.equal(v.stage, 1);
    assert.equal(v.title, "Order received!");
    assert.deepEqual(v.steps.map((s) => s.stage), [1, 2, 4, 5, 8, 9]);
    assert.equal(v.steps[0].state, "current");
  });

  test("steps 3, 6 and 7 are left out when the data cannot back them", () => {
    const v = view({ status: "VENDOR_ACCEPTED", userId: "u" });
    assert.equal(v.stage, 2);
    assert.ok(!v.steps.some((s) => s.stage === 3));
    assert.ok(!v.steps.some((s) => s.stage === 6 || s.stage === 7));
  });

  test("step 3 appears once the store has a picking record", () => {
    const v = view({ status: "VENDOR_ACCEPTED", pickingAt: NOW - 60_000, userId: "u" });
    assert.equal(v.stage, 3);
    assert.equal(v.steps.find((s) => s.stage === 3)?.state, "current");
  });

  test("done, current and upcoming are set from the stage", () => {
    const v = view({ status: "PACKED", userId: "u" });
    assert.equal(v.stage, 4);
    const states = Object.fromEntries(v.steps.map((s) => [s.stage, s.state]));
    assert.equal(states[1], "done");
    assert.equal(states[2], "done");
    assert.equal(states[4], "current");
    assert.equal(states[5], "upcoming");
    assert.equal(states[9], "upcoming");
  });

  test("with customer coordinates, a rider 2 km away is stage 6 with the distance and first name", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", customerLocation: CUSTOMER, userId: "u" }, { rider: at(2), riderFirstName: "Ravi" });
    assert.equal(v.stage, 6);
    assert.equal(v.title, "Almost there");
    assert.equal(v.subtitle, "Ravi is 2.0 km away from your location.");
    assert.equal(v.distanceKm, 2);
    assert.equal(v.hasCustomerLocation, true);
    assert.equal(v.map.available, true);
    assert.equal(v.steps.find((s) => s.stage === 6)?.state, "current");
  });

  test("distance is omitted outside stages 6 and 7", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", customerLocation: CUSTOMER, userId: "u" }, { rider: at(4), riderFirstName: "Ravi" });
    assert.equal(v.stage, 5);
    assert.equal(v.distanceKm, null);
    assert.equal(v.subtitle, "Ravi has picked up your order and is heading to you.");
  });

  test("with no rider name after assignment, the copy uses the neutral fallback", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", userId: "u" }, { rider: null, riderFirstName: null });
    assert.equal(v.stage, 5);
    assert.equal(v.subtitle, "Your delivery partner has picked up your order and is heading to you.");
    assert.equal(v.riderFirstName, null);
  });

  test("stage 8 has no code in the view: the code comes from the delivery-code route only", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", riderArrivedAt: NOW, userId: "u" }, { riderFirstName: "Ravi" });
    assert.equal(v.stage, 8);
    assert.equal(v.subtitle, "Share your delivery OTP to collect your order.");
    assert.ok(!JSON.stringify(v).includes("deliveryCode"));
  });

  test("a delay banner shows while the record is fresh", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", userId: "u", delay: { reason: "TRAFFIC", newArrivalAt: NOW + 20 * 60_000, setBy: "s", setAt: NOW - 60_000 } });
    assert.deepEqual(v.delay, { reason: "TRAFFIC", newArrivalAt: NOW + 20 * 60_000 });
    const banner = delayBanner(v.delay, v.riderFirstName);
    assert.equal(banner?.title, "Running a little late");
    assert.equal(banner?.body, "Heavy traffic on the way. New arrival time: 5:50 pm.");
  });

  test("an old delay record shows no banner", () => {
    const v = view({ status: "OUT_FOR_DELIVERY", userId: "u", delay: { reason: "RAIN", newArrivalAt: NOW, setBy: "s", setAt: NOW - 4 * 60 * 60_000 } });
    assert.equal(v.delay, null);
  });

  test("a cancelled order has a cancellation message and no stages", () => {
    const v = view({ status: "CANCELLED", userId: "u" });
    assert.equal(v.cancelled, true);
    assert.equal(v.stage, null);
    assert.equal(v.title, "Order cancelled");
    assert.equal(v.subtitle, "This order was cancelled and will not be delivered.");
    assert.deepEqual(v.steps, []);
  });

  test("a store rejection reads as a cancellation with the store's wording", () => {
    const v = view({ status: "VENDOR_REJECTED", userId: "u" });
    assert.equal(v.subtitle, "This order was cancelled by the store.");
  });

  test("a staff cancellation in the overlay wins over the shop status", () => {
    const v = liveTrackingView({
      order: { status: "PACKED", userId: "u" },
      overlay: { fulfilment: "CANCELLED" },
      orderId: "GV-1",
      now: NOW,
      rider: null,
      riderFirstName: null,
      store: null,
      storePhone: null,
    });
    assert.equal(v.cancelled, true);
  });

  test("an unknown status shows a neutral title and no stage", () => {
    const v = view({ status: "SOMETHING_NEW", userId: "u" });
    assert.equal(v.stage, null);
    assert.equal(v.title, "Order in progress");
    assert.ok(v.steps.every((s) => s.state === "upcoming"));
  });

  test("the estimate comes from an express slot only, and counts down to its end", () => {
    assert.equal(view({ status: "PLACED", userId: "u", deliverySlot: { kind: "express", endsAt: NOW + 17 * 60_000 } }).estimateMinutes, 17);
    assert.equal(view({ status: "PLACED", userId: "u", deliverySlot: { kind: "window", endsAt: NOW + 60 * 60_000 } }).estimateMinutes, null);
    assert.equal(view({ status: "PLACED", userId: "u", deliverySlot: { kind: "express", endsAt: NOW - 1000 } }).estimateMinutes, null);
  });

  test("no estimate once delivered", () => {
    assert.equal(view({ status: "DELIVERED", userId: "u", deliverySlot: { kind: "express", endsAt: NOW + 60_000 } }).estimateMinutes, null);
  });

  test("the view carries no personal details or internal ids", () => {
    const v = view(
      {
        status: "OUT_FOR_DELIVERY",
        userId: "u-private-uid",
        customerPhone: "9876543210",
        customerName: "Asha Rao",
        shippingAddress: { fullAddress: "12 Lake Road", phoneNumber: "9876543210" },
        vendorUid: "vendor-secret",
        razorpayOrderId: "order_secret",
        customerLocation: CUSTOMER,
      },
      { rider: at(2), riderFirstName: "Ravi", store: { name: "Store", address: "1 Market St, Vijayawada" }, storePhone: "+91 00000 00000" },
    );
    const json = JSON.stringify(v);
    for (const secret of ["9876543210", "Asha Rao", "12 Lake Road", "u-private-uid", "vendor-secret", "order_secret"]) {
      assert.equal(json.includes(secret), false, secret);
    }
  });

  test("map.available is false when there is nothing to draw", () => {
    assert.equal(view({ status: "PLACED", userId: "u" }).map.available, false);
  });

  test("the share view carries no delivery code at any stage", () => {
    for (const status of ["OUT_FOR_DELIVERY", "PACKED", "DELIVERED"]) {
      const json = JSON.stringify(view({ status, riderArrivedAt: NOW, userId: "u" }, { riderFirstName: "Ravi" }));
      assert.ok(!/"code"|"deliveryCode"|"otp"/i.test(json), status);
    }
  });

  test("the store phone appears only when one was passed in", () => {
    assert.equal(view({ status: "PLACED", userId: "u" }).storePhone, null);
    assert.equal(view({ status: "PLACED", userId: "u" }, { storePhone: "+91 12345 67890" }).storePhone, "+91 12345 67890");
  });
});
