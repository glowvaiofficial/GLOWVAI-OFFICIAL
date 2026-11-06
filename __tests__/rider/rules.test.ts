import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createWindowLimiter } from "../../lib/shop/support";
import {
  assignmentView,
  canAssign,
  canUnassign,
  cashVerdict,
  cleanNote,
  customerLocation,
  deliveryDetailsView,
  freshLocation,
  locationDoc,
  planException,
  planStart,
  roundCoord,
  validCoords,
  type Doc,
} from "../../lib/rider/rules";

const NOW = 1_800_000_000_000;
const PARTNER = "partner_a";

const order = (over: Doc = {}): Doc => ({
  orderId: "GV-261106-ABCDEF",
  userId: "uid-customer",
  status: "PACKED",
  deliveryPartnerId: PARTNER,
  customerName: "Priya Sharma",
  customerPhone: "9876543210",
  shippingAddress: {
    recipientName: "Priya Sharma",
    fullAddress: "12, Lake View Road, Flat 4B",
    landmark: "Near the park",
    area: "Indiranagar",
    city: "Bengaluru",
    pincode: "560038",
  },
  items: [
    { productId: "p1", quantity: 2 },
    { productId: "p2", quantity: 1 },
  ],
  payment: { method: "COD", status: "PENDING" },
  pricing: { grandTotal: 749 },
  ...over,
});

describe("staff assignment rules", () => {
  const active = { id: PARTNER, active: true };

  test("READY_FOR_PICKUP and PACKED orders can be assigned to an active partner", () => {
    assert.equal(canAssign(order({ status: "READY_FOR_PICKUP", deliveryPartnerId: null }), null, active).ok, true);
    assert.equal(canAssign(order({ status: "PACKED", deliveryPartnerId: null }), null, active).ok, true);
  });

  test("other statuses cannot be assigned", () => {
    for (const status of ["PLACED", "VENDOR_ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PAYMENT_PENDING"]) {
      const v = canAssign(order({ status, deliveryPartnerId: null }), null, active);
      assert.equal(v.ok, false, status);
    }
  });

  test("an inactive partner cannot be assigned", () => {
    const v = canAssign(order({ status: "PACKED", deliveryPartnerId: null }), null, { id: PARTNER, active: false });
    assert.equal(v.ok, false);
    assert.equal(v.ok ? "" : v.code, "PARTNER_INACTIVE");
  });

  test("one partner per order: a second partner is refused, the same partner is a no-op", () => {
    const taken = order({ status: "PACKED", deliveryPartnerId: "partner_b" });
    const v = canAssign(taken, null, active);
    assert.equal(v.ok, false);
    assert.equal(v.ok ? "" : v.code, "ALREADY_ASSIGNED");
    const same = canAssign(order({ status: "PACKED" }), null, active);
    assert.deepEqual(same, { ok: true });
  });

  test("a cancelled order (shop or staff) cannot be assigned", () => {
    assert.equal(canAssign(order({ status: "CANCELLED", deliveryPartnerId: null }), null, active).ok, false);
    assert.equal(canAssign(order({ status: "PACKED", deliveryPartnerId: null }), { fulfilment: "CANCELLED" }, active).ok, false);
  });

  test("taking an order back is refused once it is out for delivery", () => {
    assert.equal(canUnassign(order({ status: "OUT_FOR_DELIVERY" }), null).ok, false);
    assert.equal(canUnassign(order({ status: "PACKED" }), null).ok, true);
    assert.equal(canUnassign(order({ status: "PACKED", deliveryPartnerId: null }), null).ok, false);
  });
});

describe("partner status guards", () => {
  test("only the assigned partner can start a delivery", () => {
    const v = planStart(order({ status: "PACKED" }), null, "partner_other");
    assert.equal(v.ok, false);
    assert.equal(v.ok ? "" : v.status, 404);
  });

  test("start is allowed from READY_FOR_PICKUP or PACKED and makes the transition", () => {
    assert.deepEqual(planStart(order({ status: "READY_FOR_PICKUP" }), null, PARTNER), { ok: true, transition: true });
    assert.deepEqual(planStart(order({ status: "PACKED" }), null, PARTNER), { ok: true, transition: true });
  });

  test("start from any other state is refused", () => {
    for (const status of ["PLACED", "VENDOR_ACCEPTED", "DELIVERED", "CANCELLED", "PAYMENT_PENDING"]) {
      assert.equal(planStart(order({ status }), null, PARTNER).ok, false, status);
    }
  });

  test("start on an order already out is a re-open with no transition", () => {
    assert.deepEqual(planStart(order({ status: "OUT_FOR_DELIVERY" }), null, PARTNER), { ok: true, transition: false });
  });

  test("a staff-cancelled order cannot be started", () => {
    assert.equal(planStart(order({ status: "PACKED" }), { fulfilment: "CANCELLED" }, PARTNER).ok, false);
  });

  test("code entry and the exception path need the order to be out and assigned", () => {
    assert.equal(planException(order({ status: "PACKED" }), null, PARTNER).ok, false);
    assert.equal(planException(order({ status: "OUT_FOR_DELIVERY" }), null, "partner_other").ok, false);
    assert.equal(planException(order({ status: "OUT_FOR_DELIVERY" }), null, PARTNER).ok, true);
  });

  test("a second open exception is refused while staff reviews the first", () => {
    const withOpen = order({ status: "OUT_FOR_DELIVERY", deliveryException: { status: "OPEN", reason: "CUSTOMER_NO_CODE" } });
    const v = planException(withOpen, null, PARTNER);
    assert.equal(v.ok, false);
    assert.equal(v.ok ? "" : v.code, "EXCEPTION_OPEN");
  });
});

describe("cash collection amount", () => {
  const out = (over: Doc = {}) => order({ status: "OUT_FOR_DELIVERY", ...over });

  test("an exact match of the order total is accepted", () => {
    assert.deepEqual(cashVerdict(out(), null, PARTNER, 749), { ok: true });
  });

  test("any other amount is refused, including 748, 750 and text", () => {
    for (const amount of [748, 750, "749", 749.5, 0, -749, null, undefined]) {
      const v = cashVerdict(out(), null, PARTNER, amount);
      assert.equal(v.ok, false, String(amount));
    }
  });

  test("online orders never take cash", () => {
    const v = cashVerdict(out({ payment: { method: "ONLINE", status: "PAID" } }), null, PARTNER, 749);
    assert.equal(v.ok, false);
    assert.equal(v.ok ? "" : v.code, "NOT_COD");
  });

  test("cash cannot be recorded twice or before the delivery starts", () => {
    assert.equal(cashVerdict(out({ cashCollectedAt: NOW }), null, PARTNER, 749).ok, false);
    assert.equal(cashVerdict(order({ status: "PACKED" }), null, PARTNER, 749).ok, false);
  });

  test("an order without a valid total cannot take cash", () => {
    assert.equal(cashVerdict(out({ pricing: {} }), null, PARTNER, 749).ok, false);
  });
});

describe("what the partner and the customer may see", () => {
  test("the list row has no name, phone or full address", () => {
    const row = assignmentView(order({ status: "PACKED" }), null);
    const text = JSON.stringify(row);
    assert.ok(!text.includes("Priya"));
    assert.ok(!text.includes("9876543210"));
    assert.ok(!text.includes("Lake View"));
    assert.equal(row.itemsCount, 3);
    assert.equal(row.area, "Indiranagar");
    assert.equal(row.pincode, "560038");
    assert.deepEqual(row.payment, { method: "COD", amountToCollect: 749, paid: false });
  });

  test("an online order shows as paid, with nothing to collect", () => {
    const row = assignmentView(order({ payment: { method: "ONLINE", status: "PAID" } }), null);
    assert.deepEqual(row.payment, { method: "ONLINE", amountToCollect: null, paid: true });
  });

  test("the details after start carry the first name only, and the phone only when present", () => {
    const d = deliveryDetailsView(order({ status: "OUT_FOR_DELIVERY" }));
    assert.equal(d.customerFirstName, "Priya");
    assert.equal(d.fullAddress, "12, Lake View Road, Flat 4B");
    assert.equal(d.customerPhone, "9876543210");
    const noPhone = deliveryDetailsView(order({ customerName: "", customerPhone: "", shippingAddress: { recipientName: "Ravi" } }));
    assert.equal(noPhone.customerPhone, null);
    assert.equal(noPhone.customerFirstName, "Ravi");
  });

  test("a malformed phone is never returned for a tap-to-call", () => {
    assert.equal(deliveryDetailsView(order({ customerPhone: "+44 20 7946 0958" })).customerPhone, null);
  });

  test("coordinates are rounded to 3 decimals and an old point is not shown", () => {
    assert.equal(roundCoord(12.97161), 12.972);
    assert.equal(roundCoord(77.59469), 77.595);
    assert.equal(roundCoord(-0.0004), -0);
    const doc = locationDoc(PARTNER, 12.97161, 77.59469, 8, NOW);
    assert.deepEqual(freshLocation(doc, PARTNER, NOW + 60_000), { lat: 12.972, lng: 77.595, updatedAt: NOW });
  });

  test("a location expires 15 minutes after it was written", () => {
    const doc = locationDoc(PARTNER, 12.9, 77.5, null, NOW);
    assert.equal(doc.expiresAt, NOW + 15 * 60_000);
    assert.ok(freshLocation(doc, PARTNER, NOW + 15 * 60_000 - 1));
    assert.equal(freshLocation(doc, PARTNER, NOW + 15 * 60_000), null);
  });

  test("a location is never read for another partner or with invalid coordinates", () => {
    const doc = locationDoc(PARTNER, 12.9, 77.5, null, NOW);
    assert.equal(freshLocation(doc, "partner_other", NOW), null);
    assert.equal(freshLocation({ ...doc, lat: 200 }, PARTNER, NOW), null);
    assert.equal(freshLocation(null, PARTNER, NOW), null);
    assert.equal(validCoords(90, -180), true);
    assert.equal(validCoords(90.1, 0), false);
    assert.equal(validCoords(NaN, 0), false);
  });

  test("the customer sees the rider only while the order is out for delivery", () => {
    const doc = locationDoc(PARTNER, 12.97161, 77.59469, null, NOW);
    assert.ok(customerLocation(order({ status: "OUT_FOR_DELIVERY" }), doc, NOW));
    assert.equal(customerLocation(order({ status: "PACKED" }), doc, NOW), null);
    assert.equal(customerLocation(order({ status: "DELIVERED" }), doc, NOW), null);
  });

  test("the partner's location is sent at most 4 times a minute", () => {
    const limiter = createWindowLimiter(4, 60_000);
    const results = [0, 1, 2, 3, 4].map((i) => limiter.allow(PARTNER, NOW + i));
    assert.deepEqual(results, [true, true, true, true, false]);
  });

  test("partner notes are one line of plain text, at most 200 characters", () => {
    assert.equal(cleanNote("  Left at<script>\n gate  "), "Left at script gate");
    assert.equal(cleanNote("a".repeat(500)).length, 200);
    assert.equal(cleanNote(42), "");
  });
});
