import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  REPLACEMENT_REASONS,
  RETURN_STATUSES,
  RETURN_TRANSITIONS,
  canTransition,
  customerReturnView,
  evaluateReturn,
  itemLockId,
  parseReturnRequest,
  returnIdFor,
  RETURN_ID_PATTERN,
  RETURN_WINDOW_MS,
  type ParsedReturnRequest,
} from "../../lib/shop/returns";
import { deliveredAtOf, isDelivered, type Doc } from "../../lib/shop/orderState";

const DAY = 24 * 60 * 60 * 1000;
const DELIVERED = Date.UTC(2026, 10, 1, 10, 0);
const NOW = DELIVERED + 2 * DAY;

const baseOrder = (extra: Doc = {}): Doc => ({
  orderId: "GV-261101-ABC123",
  userId: "uid-1",
  status: "DELIVERED",
  deliveredAt: DELIVERED,
  items: [
    { productId: "p-serum", productName: "Serum", quantity: 2, unitPrice: 500 },
    { productId: "p-cream", productName: "Cream", quantity: 1, unitPrice: 300 },
  ],
  events: [{ at: DELIVERED - 1000, actor: "Vendor X", event: "Order packed, waiting for pickup" }],
  ...extra,
});

const req = (extra: Partial<ParsedReturnRequest> = {}): ParsedReturnRequest => ({
  type: "RETURN",
  reason: "DAMAGED",
  note: "",
  items: [{ productId: "p-serum", quantity: 1 }],
  ...extra,
});

const check = (order: Doc, request: ParsedReturnRequest, opts: { now?: number; overlay?: Doc | null; already?: string[] } = {}) =>
  evaluateReturn({ order, overlay: opts.overlay ?? null, now: opts.now ?? NOW, request, alreadyRequested: new Set(opts.already ?? []) });

describe("returns: request parsing", () => {
  test("accepts a valid return", () => {
    const r = parseReturnRequest({ type: "RETURN", reason: "NO_LONGER_NEEDED", note: "  thanks  ", items: [{ productId: "p-serum", quantity: 1 }] });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.note, "thanks");
  });

  test("rejects an unknown type and reason", () => {
    assert.equal(parseReturnRequest({ type: "EXCHANGE", reason: "DAMAGED", items: [{ productId: "p", quantity: 1 }] }).ok, false);
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "BORED", items: [{ productId: "p", quantity: 1 }] }).ok, false);
  });

  test("replacement cannot be NO_LONGER_NEEDED, and every replacement reason is accepted", () => {
    const refused = parseReturnRequest({ type: "REPLACEMENT", reason: "NO_LONGER_NEEDED", items: [{ productId: "p", quantity: 1 }] });
    assert.equal(refused.ok, false);
    for (const reason of REPLACEMENT_REASONS) {
      assert.equal(parseReturnRequest({ type: "REPLACEMENT", reason, items: [{ productId: "p", quantity: 1 }] }).ok, true, reason);
    }
  });

  test("note is capped at 500 characters", () => {
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", note: "x".repeat(501), items: [{ productId: "p", quantity: 1 }] }).ok, false);
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", note: "x".repeat(500), items: [{ productId: "p", quantity: 1 }] }).ok, true);
  });

  test("quantity bounds: integer from 1 to 99", () => {
    for (const quantity of [0, -1, 1.5, 100, Number.NaN, "2"]) {
      assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: [{ productId: "p", quantity }] }).ok, false, String(quantity));
    }
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: [{ productId: "p", quantity: 99 }] }).ok, true);
  });

  test("duplicate items, empty lists, bad product ids and too many lines are refused", () => {
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: [] }).ok, false);
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: [{ productId: "p", quantity: 1 }, { productId: "p", quantity: 1 }] }).ok, false);
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: [{ productId: "a/b", quantity: 1 }] }).ok, false);
    const many = Array.from({ length: 21 }, (_, i) => ({ productId: `p-${i}`, quantity: 1 }));
    assert.equal(parseReturnRequest({ type: "RETURN", reason: "DAMAGED", items: many }).ok, false);
  });
});

describe("returns: eligibility", () => {
  test("a delivered order within 7 days can be returned", () => {
    const r = check(baseOrder(), req());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.deliveredAt, DELIVERED);
      assert.equal(r.windowEndsAt, DELIVERED + RETURN_WINDOW_MS);
      assert.deepEqual(r.lines, [{ productId: "p-serum", title: "Serum", quantity: 1, unitPrice: 500 }]);
    }
  });

  test("the window closes after 7 days, and the day-7 boundary is still open", () => {
    assert.equal(check(baseOrder(), req(), { now: DELIVERED + 7 * DAY }).ok, true);
    const late = check(baseOrder(), req(), { now: DELIVERED + 7 * DAY + 1 });
    assert.equal(late.ok, false);
    if (!late.ok) assert.equal(late.code, "WINDOW_CLOSED");
  });

  test("cancelled orders are refused, including when staff cancelled them", () => {
    const byStatus = check(baseOrder({ status: "CANCELLED" }), req());
    assert.equal(byStatus.ok, false);
    if (!byStatus.ok) assert.equal(byStatus.code, "CANCELLED");
    const byStaff = check(baseOrder(), req(), { overlay: { fulfilment: "CANCELLED" } });
    assert.equal(byStaff.ok, false);
    if (!byStaff.ok) assert.equal(byStaff.code, "CANCELLED");
  });

  test("an order that has not been delivered cannot be returned", () => {
    const r = check(baseOrder({ status: "PACKED", deliveredAt: undefined, events: [] }), req());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "NOT_DELIVERED");
  });

  test("a delivered status with no known delivery time is refused with a clear message", () => {
    const r = check(baseOrder({ deliveredAt: undefined, events: [] }), req());
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "DELIVERY_DATE_UNKNOWN");
      assert.match(r.error, /could not confirm when this order was delivered/);
    }
  });

  test("the delivery date falls back to the last delivered event when deliveredAt is absent", () => {
    const order = baseOrder({
      deliveredAt: undefined,
      events: [
        { at: DELIVERED - 5 * DAY, status: "DELIVERED", event: "old entry" },
        { at: DELIVERED, status: "delivered", event: "Delivered to customer" },
        { at: DELIVERED + DAY, status: "PACKED", event: "Packed" },
      ],
    });
    assert.equal(deliveredAtOf(order), DELIVERED);
    assert.equal(check(order, req()).ok, true);
  });

  test("event text is used only for older entries without a status field", () => {
    const order = baseOrder({ deliveredAt: undefined, events: [{ at: DELIVERED, event: "Order delivered" }] });
    assert.equal(deliveredAtOf(order), DELIVERED);
    const notDelivered = baseOrder({ deliveredAt: undefined, events: [{ at: DELIVERED, event: "Delivery partner assigned" }] });
    assert.equal(deliveredAtOf(notDelivered), null);
  });

  test("an item that is not in the order is refused", () => {
    const r = check(baseOrder(), req({ items: [{ productId: "p-other", quantity: 1 }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "NOT_IN_ORDER");
  });

  test("quantity cannot exceed what was ordered", () => {
    const r = check(baseOrder(), req({ items: [{ productId: "p-serum", quantity: 3 }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "QUANTITY");
    assert.equal(check(baseOrder(), req({ items: [{ productId: "p-serum", quantity: 2 }] })).ok, true);
  });

  test("each item can be requested only once, even if an earlier request was rejected", () => {
    const r = check(baseOrder(), req(), { already: ["p-serum"] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "ALREADY_REQUESTED");
    // A different item on the same order is still open.
    assert.equal(check(baseOrder(), req({ items: [{ productId: "p-cream", quantity: 1 }] }), { already: ["p-serum"] }).ok, true);
  });

  test("a delivery date in the future is not trusted", () => {
    const r = check(baseOrder({ deliveredAt: NOW + DAY }), req());
    assert.equal(r.ok, false);
  });

  test("isDelivered reflects status, staff decision and the delivery time", () => {
    assert.equal(isDelivered(baseOrder(), null), true);
    assert.equal(isDelivered(baseOrder({ status: "PACKED", deliveredAt: undefined, events: [] }), { fulfilment: "DELIVERED" }), true);
    assert.equal(isDelivered(baseOrder({ status: "PACKED", deliveredAt: undefined, events: [] }), null), false);
  });
});

describe("returns: ids and idempotency", () => {
  test("the same user and request id give the same return id", () => {
    assert.equal(returnIdFor("uid-1", "req-00000001"), returnIdFor("uid-1", "req-00000001"));
    assert.notEqual(returnIdFor("uid-1", "req-00000001"), returnIdFor("uid-2", "req-00000001"));
    assert.notEqual(returnIdFor("uid-1", "req-00000001"), returnIdFor("uid-1", "req-00000002"));
    assert.match(returnIdFor("uid-1", "req-00000001"), RETURN_ID_PATTERN);
  });

  test("item locks are per order and per product", () => {
    assert.equal(itemLockId("GV-1", "p-a"), "GV-1__p-a");
    assert.notEqual(itemLockId("GV-1", "p-a"), itemLockId("GV-2", "p-a"));
  });
});

describe("returns: state machine", () => {
  test("valid transitions for a return", () => {
    const path: [string, string][] = [
      ["REQUESTED", "APPROVED"],
      ["APPROVED", "PICKUP_SCHEDULED"],
      ["PICKUP_SCHEDULED", "RECEIVED"],
      ["RECEIVED", "REFUNDED"],
      ["REFUNDED", "CLOSED"],
    ];
    for (const [from, to] of path) assert.equal(canTransition("RETURN", from as never, to as never), true, `${from} -> ${to}`);
  });

  test("valid transitions for a replacement", () => {
    assert.equal(canTransition("REPLACEMENT", "REQUESTED", "APPROVED"), true);
    assert.equal(canTransition("REPLACEMENT", "APPROVED", "REPLACEMENT_SHIPPED"), true);
    assert.equal(canTransition("REPLACEMENT", "REPLACEMENT_SHIPPED", "CLOSED"), true);
  });

  test("rejections close the request", () => {
    assert.equal(canTransition("RETURN", "REQUESTED", "REJECTED"), true);
    assert.equal(canTransition("REPLACEMENT", "REJECTED", "CLOSED"), true);
  });

  test("invalid transitions are refused", () => {
    assert.equal(canTransition("RETURN", "REQUESTED", "REFUNDED"), false);
    assert.equal(canTransition("RETURN", "REQUESTED", "REQUESTED"), false);
    assert.equal(canTransition("RETURN", "CLOSED", "REQUESTED"), false);
    assert.equal(canTransition("RETURN", "REJECTED", "APPROVED"), false);
    assert.equal(canTransition("RETURN", "APPROVED", "REFUNDED"), false);
    assert.equal(canTransition("RETURN", "RECEIVED", "CLOSED"), false, "a received return is refunded before it closes");
  });

  test("a replacement never goes through the return-only states", () => {
    for (const to of ["PICKUP_SCHEDULED", "RECEIVED", "REFUNDED"] as const) {
      assert.equal(canTransition("REPLACEMENT", "APPROVED", to), false, to);
    }
    assert.equal(canTransition("RETURN", "APPROVED", "REPLACEMENT_SHIPPED"), false);
  });

  test("CLOSED is final, and every state in the table is a known state", () => {
    for (const status of RETURN_STATUSES) {
      assert.equal(RETURN_TRANSITIONS.RETURN[status] === undefined || RETURN_TRANSITIONS.RETURN[status]!.length > 0, true);
      assert.equal(canTransition("RETURN", "CLOSED", status), false);
      assert.equal(canTransition("REPLACEMENT", "CLOSED", status), false);
    }
    for (const type of ["RETURN", "REPLACEMENT"] as const) {
      for (const [from, targets] of Object.entries(RETURN_TRANSITIONS[type])) {
        assert.ok((RETURN_STATUSES as readonly string[]).includes(from), from);
        for (const to of targets ?? []) assert.ok((RETURN_STATUSES as readonly string[]).includes(to), to);
      }
    }
  });
});

describe("returns: customer view", () => {
  test("the customer view has no owner, no actors and no staff notes", () => {
    const stored: Doc = {
      returnId: "RT-X",
      requestId: "req-00000001",
      orderId: "GV-1",
      uid: "uid-1",
      type: "RETURN",
      reason: "DAMAGED",
      note: "Cap cracked",
      items: [{ productId: "p-serum", title: "Serum", quantity: 1, unitPrice: 500 }],
      status: "APPROVED",
      deliveredAt: DELIVERED,
      createdAt: 1,
      updatedAt: 3,
      events: [
        { at: 1, actor: "Customer", status: "REQUESTED", note: "" },
        { at: 2, actor: "admin:priya", status: "APPROVED", note: "Fraud check passed, internal" },
      ],
    };
    const view = customerReturnView(stored, "RT-X");
    const text = JSON.stringify(view);
    assert.equal(text.includes("uid-1"), false);
    assert.equal(text.includes("admin:priya"), false);
    assert.equal(text.includes("internal"), false);
    assert.equal(text.includes("Customer"), false);
    assert.deepEqual(view.timeline, [
      { at: 1, status: "REQUESTED" },
      { at: 2, status: "APPROVED" },
    ]);
    assert.equal(view.status, "APPROVED");
  });
});
