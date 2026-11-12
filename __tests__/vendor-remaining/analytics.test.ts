import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_CACHE_MS,
  ANALYTICS_QUERY_LIMIT,
  ORDER_VALUE_LABEL,
  cachedAnalytics,
  computeAnalytics,
  parseDays,
  rememberAnalytics,
  type AnalyticsResult,
} from "../../lib/vendor/analytics";

const NOW = Date.parse("2026-11-07T10:00:00Z"); // 15:30 IST on 7 Nov 2026
const DAY = 86_400_000;
const H = 3_600_000;

const item = (productId: string, productName: string, quantity: number, unitPrice: number) => ({ productId, productName, quantity, unitPrice });

function order(id: string, createdAt: number, status: string, extra: Record<string, unknown> = {}) {
  return { orderId: id, vendorUid: "me", status, createdAt, items: [], ...extra };
}

// A small, hand-checked set of orders for the 7-day window.
const A = order("A", NOW - H, "PACKED", {
  vendorAcceptedAt: NOW - H + 60_000,
  items: [item("soap", "Soap", 2, 100), item("serum", "Serum", 1, 400)],
});
const B = order("B", NOW - 2 * DAY, "DELIVERED", { vendorAcceptedAt: NOW - 2 * DAY + 120_000, items: [item("serum", "Serum", 3, 400)] });
const C = order("C", NOW - 3 * DAY, "CANCELLED", { vendorAcceptedAt: NOW - 3 * DAY + 30_000, items: [item("soap", "Soap", 5, 100)] });
const D = order("D", NOW - 4 * DAY, "VENDOR_ACCEPTED", { vendorAcceptedAt: NOW - 4 * DAY + 90_000, items: [item("serum", "Serum", 1, 400)] });
const E = order("E", NOW - 10 * DAY, "DELIVERED", { vendorAcceptedAt: NOW - 10 * DAY + 600_000, items: [item("soap", "Soap", 9, 100)] });
const F = order("F", NOW - DAY, "PLACED", { dispatch: { declinedBy: ["me"] } });
const G = order("G", NOW - 40 * DAY, "PLACED", { dispatch: { declinedBy: ["me"] } });

describe("analytics inputs", () => {
  test("only 7 or 30 days are accepted", () => {
    assert.equal(parseDays(null), 7);
    assert.equal(parseDays(""), 7);
    assert.equal(parseDays("30"), 30);
    assert.equal(parseDays("14"), null);
    assert.equal(parseDays("abc"), null);
  });

  test("the query bound is 500 orders", () => {
    assert.equal(ANALYTICS_QUERY_LIMIT, 500);
  });
});

describe("analytics maths (7 days)", () => {
  const r: AnalyticsResult = computeAnalytics({ mine: [A, B, C, D, E], declined: [F, G] }, { now: NOW, days: 7 });

  test("accepted and declined are counted inside the window only", () => {
    assert.deepEqual(r.totals, { orders: 5, accepted: 4, declined: 1 });
  });

  test("orders per day: seven IST days, oldest first, summing to the window total", () => {
    assert.equal(r.ordersPerDay.length, 7);
    assert.equal(r.ordersPerDay[6].date, "2026-11-07");
    assert.equal(r.ordersPerDay[0].date, "2026-11-01");
    assert.equal(r.ordersPerDay.reduce((s, d) => s + d.orders, 0), 5);
    assert.equal(r.ordersPerDay[6].accepted, 1); // A
    assert.equal(r.ordersPerDay[6].declined, 0);
    assert.equal(r.ordersPerDay[5].declined, 1); // F, a day earlier
  });

  test("average time to accept is the mean of vendorAcceptedAt minus createdAt, in seconds", () => {
    // A 60 s, B 120 s, C 30 s, D 90 s
    assert.equal(r.averageAcceptSeconds, 75);
  });

  test("fulfilment rate: packed-or-later over settled (packed-or-later, plus cancelled); open orders are left out", () => {
    assert.equal(r.fulfilled, 2);
    assert.equal(r.settled, 3);
    assert.equal(r.fulfilmentRate, 0.667);
  });

  test("items sold come from accepted, not cancelled orders, top products first", () => {
    assert.deepEqual(r.itemsSold, [
      { productId: "serum", title: "Serum", quantity: 5 },
      { productId: "soap", title: "Soap", quantity: 2 },
    ]);
  });

  test("order value is the gross item value of accepted, packed and delivered orders, labelled as not earnings", () => {
    // A 2*100 + 400 = 600, B 3*400 = 1200, D 400 (still accepted); C cancelled, excluded.
    assert.equal(r.orderValue.amount, 2200);
    assert.equal(r.orderValue.orderCount, 3);
    assert.equal(r.orderValue.label, ORDER_VALUE_LABEL);
    assert.equal(r.orderValue.label, "Order value — not your earnings");
  });

  test("no settled orders gives a null rate, not zero", () => {
    const empty = computeAnalytics({ mine: [D], declined: [] }, { now: NOW, days: 7 });
    assert.equal(empty.fulfilmentRate, null);
    assert.equal(empty.averageAcceptSeconds, 90_000 / 1000);
  });

  test("no orders gives empty totals and null averages", () => {
    const none = computeAnalytics({ mine: [], declined: [] }, { now: NOW, days: 7 });
    assert.deepEqual(none.totals, { orders: 0, accepted: 0, declined: 0 });
    assert.equal(none.averageAcceptSeconds, null);
    assert.equal(none.fulfilmentRate, null);
    assert.deepEqual(none.itemsSold, []);
    assert.equal(none.orderValue.amount, 0);
    assert.equal(none.bounds.truncated, false);
  });
});

describe("analytics window and bounds", () => {
  test("30 days picks up the older order that 7 days leaves out", () => {
    const r = computeAnalytics({ mine: [A, B, C, D, E], declined: [F, G] }, { now: NOW, days: 30 });
    assert.equal(r.ordersPerDay.length, 30);
    assert.equal(r.totals.accepted, 5);
    assert.equal(r.totals.declined, 1);
  });

  test("an order is counted once even if it is returned twice", () => {
    const r = computeAnalytics({ mine: [A, A], declined: [] }, { now: NOW, days: 7 });
    assert.equal(r.totals.accepted, 1);
  });

  test("the day an order was placed follows IST, not UTC", () => {
    // 19:00 UTC on 6 Nov is 00:30 IST on 7 Nov.
    const late = order("L", Date.parse("2026-11-06T19:00:00Z"), "PLACED", { dispatch: { declinedBy: ["me"] } });
    const r = computeAnalytics({ mine: [], declined: [late] }, { now: NOW, days: 7 });
    assert.equal(r.ordersPerDay[6].date, "2026-11-07");
    assert.equal(r.ordersPerDay[6].declined, 1);
  });

  test("the bound: a full read of 500 is reported as truncated, a smaller one is not", () => {
    const full = Array.from({ length: ANALYTICS_QUERY_LIMIT }, (_, i) => order(`X${i}`, NOW - H, "PLACED"));
    assert.equal(computeAnalytics({ mine: full, declined: [] }, { now: NOW, days: 7 }).bounds.truncated, true);
    assert.equal(computeAnalytics({ mine: full.slice(1), declined: [] }, { now: NOW, days: 7 }).bounds.truncated, false);
    assert.equal(computeAnalytics({ mine: [], declined: full }, { now: NOW, days: 7 }).bounds.truncated, true);
  });

  test("the maths counts only the rows it is given (the route passes at most 500 per query)", () => {
    const many = Array.from({ length: 600 }, (_, i) => order(`Y${i}`, NOW - H, "PACKED", { vendorAcceptedAt: NOW - H + 1000 }));
    const sliced = many.slice(0, ANALYTICS_QUERY_LIMIT);
    const r = computeAnalytics({ mine: sliced, declined: [] }, { now: NOW, days: 7 });
    assert.equal(r.totals.accepted, 500);
    assert.equal(r.bounds.truncated, true);
  });
});

describe("analytics cache", () => {
  const value = computeAnalytics({ mine: [], declined: [] }, { now: NOW, days: 7 });

  test("the cache holds a result for five minutes, per key", () => {
    assert.equal(ANALYTICS_CACHE_MS, 300_000);
    rememberAnalytics("cache-test:7", value, NOW);
    assert.ok(cachedAnalytics("cache-test:7", NOW + 299_000));
    assert.equal(cachedAnalytics("cache-test:7", NOW + 300_000), null);
    assert.equal(cachedAnalytics("cache-test:30", NOW), null);
  });
});
