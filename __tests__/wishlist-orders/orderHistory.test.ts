import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeOrderCursor,
  encodeOrderCursor,
  matchesFilter,
  pageOrders,
  parseOrderFilter,
  parsePageLimit,
  ratePromptFor,
  toneOfStatus,
  type HistoryOrder,
} from "../../lib/shop/orderHistory";

const order = (n: number, status: string, extra: Partial<HistoryOrder> = {}): HistoryOrder => ({
  orderId: `ORD-${String(n).padStart(3, "0")}`,
  createdAt: 1_700_000_000_000 + n * 1000,
  status,
  hasReturn: false,
  ...extra,
});

// 45 orders, oldest n=1 ... newest n=45. Every 5th is cancelled, every 3rd delivered, the rest active.
const many: HistoryOrder[] = Array.from({ length: 45 }, (_, i) => {
  const n = i + 1;
  const status = n % 5 === 0 ? "CANCELLED" : n % 3 === 0 ? "DELIVERED" : "PACKED";
  return order(n, status, { hasReturn: n === 9 || n === 18 });
});

describe("order filters", () => {
  test("unknown or missing filter values fall back to all", () => {
    assert.equal(parseOrderFilter(undefined), "all");
    assert.equal(parseOrderFilter("bogus"), "all");
    assert.equal(parseOrderFilter("delivered"), "delivered");
  });

  test("status tones: cancelled and vendor-rejected are cancelled, delivered is delivered, the rest active", () => {
    assert.equal(toneOfStatus("CANCELLED"), "cancelled");
    assert.equal(toneOfStatus("VENDOR_REJECTED"), "cancelled");
    assert.equal(toneOfStatus("DELIVERED"), "delivered");
    assert.equal(toneOfStatus("OUT_FOR_DELIVERY"), "active");
    assert.equal(toneOfStatus(""), "active");
  });

  test("Active, Delivered and Cancelled partition the orders", () => {
    const counts = { active: 0, delivered: 0, cancelled: 0 };
    for (const o of many) {
      for (const f of ["active", "delivered", "cancelled"] as const) if (matchesFilter(o, f)) counts[f] += 1;
    }
    assert.equal(counts.active + counts.delivered + counts.cancelled, 45);
    assert.equal(counts.cancelled, 9);
    assert.equal(counts.delivered, 12);
  });

  test("Returns shows only orders with a return or replacement request", () => {
    const returned = many.filter((o) => matchesFilter(o, "returns")).map((o) => o.orderId);
    assert.deepEqual(returned, ["ORD-009", "ORD-018"]);
    assert.ok(matchesFilter(order(1, "DELIVERED", { hasReturn: true }), "returns"));
  });
});

describe("order pagination", () => {
  test("first page is the newest 20 orders, with a cursor", () => {
    const page = pageOrders(many, "all", 20, null);
    assert.equal(page.items.length, 20);
    assert.equal(page.items[0].orderId, "ORD-045");
    assert.equal(page.items[19].orderId, "ORD-026");
    assert.ok(page.nextCursor);
  });

  test("walking the cursor returns every order exactly once, newest first", () => {
    const seen: string[] = [];
    let cursor: ReturnType<typeof decodeOrderCursor> = null;
    let pages = 0;
    for (;;) {
      const page = pageOrders(many, "all", 20, cursor && cursor !== "invalid" ? cursor : null);
      seen.push(...page.items.map((o) => o.orderId));
      pages += 1;
      if (!page.nextCursor) break;
      cursor = decodeOrderCursor(page.nextCursor);
      assert.notEqual(cursor, "invalid");
    }
    assert.equal(pages, 3);
    assert.equal(seen.length, 45);
    assert.equal(new Set(seen).size, 45);
    assert.equal(seen[0], "ORD-045");
    assert.equal(seen[44], "ORD-001");
  });

  test("the last page has no cursor, and an exact multiple of the limit does not offer an empty page", () => {
    const first = pageOrders(many.slice(0, 40), "all", 20, null);
    assert.equal(first.items.length, 20);
    const last = pageOrders(many.slice(0, 40), "all", 20, decodeOrderCursor(first.nextCursor) as never);
    assert.equal(last.items.length, 20);
    assert.equal(last.nextCursor, null);
  });

  test("the filter is applied before paging, so a page is full of matching orders", () => {
    const page = pageOrders(many, "cancelled", 5, null);
    assert.deepEqual(page.items.map((o) => o.orderId), ["ORD-045", "ORD-040", "ORD-035", "ORD-030", "ORD-025"]);
    const next = pageOrders(many, "cancelled", 5, decodeOrderCursor(page.nextCursor) as never);
    assert.equal(next.items[0].orderId, "ORD-020");
  });

  test("an order without a date sorts last", () => {
    const list = [order(1, "PACKED", { createdAt: null }), order(2, "PACKED")];
    assert.deepEqual(pageOrders(list, "all", 20, null).items.map((o) => o.orderId), ["ORD-002", "ORD-001"]);
  });

  test("page size: 20 by default, clamped to 1..50", () => {
    assert.equal(parsePageLimit(undefined), 20);
    assert.equal(parsePageLimit("abc"), 20);
    assert.equal(parsePageLimit("0"), 1);
    assert.equal(parsePageLimit("500"), 50);
    assert.equal(parsePageLimit("7"), 7);
  });

  test("cursors round-trip, and malformed cursors are refused", () => {
    const c = { createdAt: 1_700_000_000_123, orderId: "ORD-777" };
    assert.deepEqual(decodeOrderCursor(encodeOrderCursor(c)), c);
    assert.equal(decodeOrderCursor(""), null);
    assert.equal(decodeOrderCursor(undefined), null);
    assert.equal(decodeOrderCursor("not base64 !!"), "invalid");
    assert.equal(decodeOrderCursor(encodeOrderCursor({ createdAt: 1, orderId: "../etc" })), "invalid");
    assert.equal(decodeOrderCursor(Buffer.from('{"a":1}').toString("base64url")), "invalid");
  });
});

describe("review prompt visibility", () => {
  test("no prompt for an order that is not delivered, even with a review on file", () => {
    assert.deepEqual(ratePromptFor(false, null), { kind: "none" });
    assert.deepEqual(ratePromptFor(false, { status: "APPROVED", rating: 5, canEdit: false }), { kind: "none" });
  });

  test("a delivered product with no review shows the prompt", () => {
    assert.deepEqual(ratePromptFor(true, null), { kind: "rate" });
    assert.deepEqual(ratePromptFor(true, undefined), { kind: "rate" });
  });

  test("once reviewed the prompt is replaced by the review and its status", () => {
    const review = { status: "PENDING" as const, rating: 4, canEdit: true };
    assert.deepEqual(ratePromptFor(true, review), { kind: "reviewed", review });
  });
});
