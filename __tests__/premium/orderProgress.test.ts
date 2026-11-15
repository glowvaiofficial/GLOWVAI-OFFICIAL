import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  canSuggestAddItems,
  confirmCheckDelay,
  confirmingView,
  deliveringToLine,
  etaText,
  hasMapPoint,
  pickPromos,
  riderView,
  stageHeadline,
  stepperSteps,
  timeliness,
  trackingLayout,
} from "../../glowvai-app/features/orders/orderProgress";

describe("confirming screen", () => {
  test("placed and paid: payment done, store current", () => {
    const v = confirmingView({ status: "PLACED", paidOnline: true, riderAssigned: false });
    assert.equal(v.title, "Confirming your order");
    assert.match(v.subtitle, /Payment received/);
    assert.deepEqual(v.steps.map((s) => s.state), ["done", "current", "upcoming"]);
    assert.equal(v.steps[0].label, "Payment confirmed");
    assert.equal(v.readyForTracking, false);
  });

  test("cash on delivery says order placed, not payment", () => {
    const v = confirmingView({ status: "PLACED", paidOnline: false, riderAssigned: false });
    assert.equal(v.steps[0].label, "Order placed");
    assert.match(v.subtitle, /Order received/);
  });

  test("accepted moves on to tracking; a rider completes every step", () => {
    const accepted = confirmingView({ status: "VENDOR_ACCEPTED", paidOnline: false, riderAssigned: false });
    assert.deepEqual(accepted.steps.map((s) => s.state), ["done", "done", "current"]);
    assert.equal(accepted.readyForTracking, true);
    const rider = confirmingView({ status: "PLACED", paidOnline: false, riderAssigned: true });
    assert.deepEqual(rider.steps.map((s) => s.state), ["done", "done", "done"]);
  });

  test("payment pending and cancelled", () => {
    assert.equal(confirmingView({ status: "PAYMENT_PENDING", paidOnline: true, riderAssigned: false }).phase, "payment");
    const c = confirmingView({ status: "vendor_rejected", paidOnline: true, riderAssigned: true });
    assert.equal(c.phase, "cancelled");
    assert.equal(c.readyForTracking, false);
  });

  test("re-checks slow down and stop after ten", () => {
    assert.equal(confirmCheckDelay(0), 10_000);
    assert.equal(confirmCheckDelay(4), 15_000);
    assert.equal(confirmCheckDelay(9), 30_000);
    assert.equal(confirmCheckDelay(10), null);
    assert.equal(confirmCheckDelay(-1), null);
  });
});

describe("tracking estimate and status", () => {
  test("only a whole number of minutes from 1 to 180 is an estimate", () => {
    assert.deepEqual(etaText(5), { value: "5", unit: "mins", spoken: "Arriving in about 5 minutes" });
    assert.equal(etaText(1)?.unit, "min");
    for (const bad of [0, -2, 4.5, 181, Number.NaN, null, undefined]) assert.equal(etaText(bad as number), null);
  });

  test("On time needs something to be on time against; a delay always shows", () => {
    assert.equal(timeliness({ stage: 4, cancelled: false, hasDelay: false, hasEstimate: true }), "on-time");
    assert.equal(timeliness({ stage: 4, cancelled: false, hasDelay: false, hasEstimate: false }), null);
    assert.equal(timeliness({ stage: 5, cancelled: false, hasDelay: true, hasEstimate: false }), "delayed");
    assert.equal(timeliness({ stage: 9, cancelled: false, hasDelay: true, hasEstimate: true }), null);
    assert.equal(timeliness({ stage: 3, cancelled: true, hasDelay: false, hasEstimate: true }), null);
  });

  test("headlines use the rider's first name only when known", () => {
    assert.equal(stageHeadline(4, null), "Your order is getting packed");
    assert.equal(stageHeadline(5, "Aarav"), "Aarav is on the way");
    assert.equal(stageHeadline(5, " "), "Your rider is on the way");
    assert.equal(stageHeadline(null, "Aarav"), null);
  });
});

describe("rider row", () => {
  test("no name, no row; a phone is callable only when the server gave a full number", () => {
    assert.equal(riderView(null, null), null);
    assert.equal(riderView({ name: "" }, ""), null);
    assert.equal(riderView({ name: "9876543210" }, null), null);
    const r = riderView({ name: "Karan Kumar", phone: { display: "+91 •••••• 3210", tel: "+919876543210" } }, null);
    assert.deepEqual(r, { name: "Karan", phoneDisplay: "+91 •••••• 3210", tel: "+919876543210", initial: "K" });
    assert.equal(riderView({ name: "Karan", phone: { display: "•••• 3210", tel: "12345" } }, null)?.tel, null);
    assert.equal(riderView(null, "Aarav")?.name, "Aarav");
  });
});

describe("layout and steps", () => {
  const map = (customer: unknown, rider: unknown) => ({ available: true, customer, rider, riderUpdatedAt: null, store: null }) as never;

  test("the map layout only while out for delivery with a point to draw", () => {
    const live = { stage: 5 as const, map: map({ lat: 16.5, lng: 80.6 }, null) };
    assert.equal(trackingLayout({ live, cancelled: false, mapSupported: true }), "map");
    assert.equal(trackingLayout({ live, cancelled: false, mapSupported: false }), "card");
    assert.equal(trackingLayout({ live: { ...live, stage: 4 }, cancelled: false, mapSupported: true }), "card");
    assert.equal(trackingLayout({ live: { stage: 5, map: map({ lat: 0, lng: 0 }, null) }, cancelled: false, mapSupported: true }), "card");
    assert.equal(hasMapPoint({ map: { available: false, customer: { lat: 1, lng: 1 }, rider: null, riderUpdatedAt: null, store: null } }), false);
  });

  test("steps follow the server's list and hide the close-by stages until reached", () => {
    const fromServer = stepperSteps([{ stage: 1 }, { stage: 2 }, { stage: 4 }, { stage: 5 }, { stage: 6 }, { stage: 7 }, { stage: 8 }, { stage: 9 }], 4);
    assert.deepEqual(fromServer.map((s) => s.stage), [1, 2, 4, 5, 9]);
    assert.deepEqual(fromServer.map((s) => s.state), ["done", "done", "current", "upcoming", "upcoming"]);
    const near = stepperSteps(null, 7);
    assert.deepEqual(near.map((s) => s.stage), [1, 2, 4, 5, 7, 9]);
    assert.ok(stepperSteps(null, null).every((s) => s.state === "upcoming"));
  });

  test("add items only before pickup; address line; promos skip sponsored", () => {
    assert.equal(canSuggestAddItems(3, false), true);
    assert.equal(canSuggestAddItems(5, false), false);
    assert.equal(canSuggestAddItems(2, true), false);
    assert.equal(deliveringToLine({ fullAddress: "12 MG Road", city: "Vijayawada", pincode: "520010" }), "12 MG Road, Vijayawada, 520010");
    assert.equal(deliveringToLine(null), null);
    assert.deepEqual(pickPromos([{ kind: "sponsored" }, { kind: "banner" }, { kind: "offer" }, { kind: "festival" }], 2).map((p) => p.kind), ["banner", "offer"]);
    assert.deepEqual(pickPromos(undefined, 2), []);
  });
});
