import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { commissionRate, computeLedger, toSettlement, LEDGER_ORDER_LIMIT } from "../../lib/vendor/ledger";

const order = (id: string, price: number, qty = 1, extra: Record<string, unknown> = {}) => ({
  orderId: id,
  status: "DELIVERED",
  deliveredAt: 1000,
  items: [{ productId: "p1", title: "Serum", quantity: qty, price, unitPrice: price }],
  ...extra,
});
const config = { id: "financeSettings", value: { commissionPercent: 10 } };

describe("vendor ledger", () => {
  test("commission rate: valid, missing and out of range", () => {
    assert.equal(commissionRate(config), 10);
    assert.equal(commissionRate({ commissionPercent: 12.5 }), 12.5);
    assert.equal(commissionRate(null), null);
    assert.equal(commissionRate({ value: { commissionPercent: null } }), null);
    assert.equal(commissionRate({ value: { commissionPercent: 150 } }), null);
  });

  test("delivered orders only, commission, settled and balance", () => {
    const r = computeLedger(
      {
        orders: [order("A", 500, 2), order("B", 200), order("C", 999, 1, { status: "CANCELLED" }), order("A", 500, 2)],
        settlements: [
          { id: "STL-1", status: "RELEASED", netPayout: 400, period: "Oct" },
          { id: "STL-2", status: "PENDING", netPayout: 100 },
        ],
        config,
      },
      5,
    );
    assert.equal(r.summary.deliveredOrders, 2);
    assert.equal(r.summary.gross, 1200);
    assert.equal(r.summary.commission, 120);
    assert.equal(r.summary.netEarnings, 1080);
    assert.equal(r.summary.settled, 400);
    assert.equal(r.summary.pending, 100);
    assert.equal(r.summary.balanceDue, 680);
  });

  test("no commission rate leaves commission, earnings and balance null", () => {
    const r = computeLedger({ orders: [order("A", 100)], settlements: [], config: null }, 5);
    assert.equal(r.summary.gross, 100);
    assert.equal(r.summary.commission, null);
    assert.equal(r.summary.netEarnings, null);
    assert.equal(r.summary.balanceDue, null);
    assert.equal(r.recentOrders[0].net, null);
  });

  test("balance never goes below zero and empty input is zeros", () => {
    const over = computeLedger({ orders: [order("A", 100)], settlements: [{ id: "S", status: "RELEASED", netPayout: 500 }], config }, 5);
    assert.equal(over.summary.balanceDue, 0);
    const empty = computeLedger({ orders: [], settlements: [], config }, 5);
    assert.equal(empty.summary.gross, 0);
    assert.equal(empty.summary.balanceDue, 0);
    assert.deepEqual(empty.recentOrders, []);
  });

  test("rounds to paise, sorts newest first, flags truncation, rejects bad settlements", () => {
    const r = computeLedger({ orders: [order("A", 33.33, 1, { deliveredAt: 1 }), order("B", 10, 1, { deliveredAt: 9 })], settlements: [], config: { commissionPercent: 7 } }, 5);
    assert.equal(r.recentOrders[0].orderId, "B");
    assert.equal(r.recentOrders[1].commission, 2.33);
    assert.equal(r.bounds.truncated, false);
    const many = Array.from({ length: LEDGER_ORDER_LIMIT }, (_, i) => order(`O${i}`, 1));
    assert.equal(computeLedger({ orders: many, settlements: [], config }, 5).bounds.truncated, true);
    assert.equal(toSettlement({ id: "X", status: "WEIRD", netPayout: 1 }), null);
    assert.equal(toSettlement({ id: "X", status: "RELEASED" }), null);
  });
});
