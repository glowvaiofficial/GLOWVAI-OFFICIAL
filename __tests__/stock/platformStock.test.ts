import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_STOCK,
  planRelease,
  planReservation,
  planRetake,
  reservationFor,
  stockProblemMessage,
  trackedStock,
  type ProductStock,
} from "../../lib/shop/platformStock";

const products = (rows: Record<string, ProductStock | undefined>) => new Map(Object.entries(rows));
const serum = (stock: unknown): ProductStock => ({ status: "PUBLISHED", stock, productName: "Serum", brandPrice: 500 });

describe("trackedStock", () => {
  test("a missing or non-numeric stock field means the product is not tracked", () => {
    assert.equal(trackedStock(undefined), null);
    assert.equal(trackedStock(null), null);
    assert.equal(trackedStock("12"), null);
    assert.equal(trackedStock(Number.NaN), null);
  });
  test("tracked stock is a whole number from 0 to the maximum", () => {
    assert.equal(trackedStock(49.9), 49);
    assert.equal(trackedStock(-3), 0);
    assert.equal(trackedStock(MAX_STOCK + 5), MAX_STOCK);
    assert.equal(trackedStock(0), 0);
  });
});

describe("planReservation", () => {
  test("an order for one unit of 50 leaves 49", () => {
    const plan = planReservation([{ productId: "s1", quantity: 1 }], products({ s1: serum(50) }));
    assert.deepEqual(plan, { ok: true, decrements: [{ productId: "s1", quantity: 1, before: 50, after: 49 }] });
  });

  test("an order that asks for more than is left is refused with the shortage", () => {
    const plan = planReservation([{ productId: "s1", quantity: 3 }], products({ s1: serum(2) }));
    assert.equal(plan.ok, false);
    if (!plan.ok) assert.deepEqual(plan.shortages, [{ productId: "s1", name: "Serum", requested: 3, available: 2 }]);
  });

  test("an exact quantity is allowed and leaves zero", () => {
    const plan = planReservation([{ productId: "s1", quantity: 3 }], products({ s1: serum(3) }));
    assert.deepEqual(plan, { ok: true, decrements: [{ productId: "s1", quantity: 3, before: 3, after: 0 }] });
  });

  test("a product with no stock field is not tracked: nothing is blocked or decremented", () => {
    const plan = planReservation([{ productId: "legacy", quantity: 9 }], products({ legacy: { status: "PUBLISHED", brandPrice: 300 } }));
    assert.deepEqual(plan, { ok: true, decrements: [] });
  });

  test("a product that does not exist makes the order unavailable", () => {
    const plan = planReservation([{ productId: "gone", quantity: 1 }], products({ gone: undefined }));
    assert.deepEqual(plan, { ok: false, shortages: [], unavailable: ["gone"] });
  });

  test("multi-line atomicity: one short line means nothing is decremented for any line", () => {
    const plan = planReservation(
      [
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 5 },
      ],
      products({ a: serum(10), b: serum(1) }),
    );
    assert.equal(plan.ok, false);
    assert.equal("decrements" in plan, false);
    if (!plan.ok) assert.deepEqual(plan.shortages.map((s) => s.productId), ["b"]);
  });

  test("repeated lines for one product are checked against their total", () => {
    const plan = planReservation(
      [
        { productId: "s1", quantity: 2 },
        { productId: "s1", quantity: 2 },
      ],
      products({ s1: serum(3) }),
    );
    assert.equal(plan.ok, false);
    if (!plan.ok) assert.equal(plan.shortages[0].requested, 4);
  });

  test("mixed tracked and untracked lines: only the tracked line is decremented", () => {
    const plan = planReservation(
      [
        { productId: "s1", quantity: 1 },
        { productId: "legacy", quantity: 2 },
      ],
      products({ s1: serum(4), legacy: { status: "PUBLISHED" } }),
    );
    assert.deepEqual(plan, { ok: true, decrements: [{ productId: "s1", quantity: 1, before: 4, after: 3 }] });
  });
});

describe("planRelease (restore)", () => {
  const reservation = reservationFor([{ productId: "s1", quantity: 2, before: 5, after: 3 }]);

  test("a cancelled order gives its units back", () => {
    assert.deepEqual(planRelease(reservation, products({ s1: serum(3) })), [{ productId: "s1", quantity: 2, before: 3, after: 5 }]);
  });

  test("restore is idempotent: once released, a second restore changes nothing", () => {
    const released = { ...reservation, releasedAt: 1_762_400_000_000 };
    assert.deepEqual(planRelease(released, products({ s1: serum(3) })), []);
  });

  test("a product that was deleted is not re-created", () => {
    assert.deepEqual(planRelease(reservation, products({ s1: undefined })), []);
  });

  test("an order with no reservation restores nothing", () => {
    assert.deepEqual(planRelease(null, products({})), []);
    assert.deepEqual(planRelease(undefined, products({})), []);
  });
});

describe("planRetake (payment confirmed after a release)", () => {
  test("takes the stock again when it is there", () => {
    const released = { ...reservationFor([{ productId: "s1", quantity: 2, before: 5, after: 3 }]), releasedAt: 1 };
    const r = planRetake(released, products({ s1: serum(5) }));
    assert.deepEqual(r.decrements, [{ productId: "s1", quantity: 2, before: 5, after: 3 }]);
    assert.deepEqual(r.short, []);
  });

  test("never goes below zero: a short line is clamped and reported", () => {
    const released = { ...reservationFor([{ productId: "s1", quantity: 2, before: 5, after: 3 }]), releasedAt: 1 };
    const r = planRetake(released, products({ s1: serum(1) }));
    assert.deepEqual(r.decrements, [{ productId: "s1", quantity: 1, before: 1, after: 0 }]);
    assert.equal(r.short.length, 1);
    assert.equal(r.short[0].available, 1);
  });

  test("does nothing when the reservation was never released", () => {
    const held = reservationFor([{ productId: "s1", quantity: 2, before: 5, after: 3 }]);
    assert.deepEqual(planRetake(held, products({ s1: serum(3) })), { decrements: [], short: [] });
  });
});

describe("reservationFor and messages", () => {
  test("the stored reservation lists the tracked lines and starts unreleased", () => {
    assert.deepEqual(reservationFor([{ productId: "s1", quantity: 2, before: 5, after: 3 }]), {
      platform: [{ productId: "s1", quantity: 2 }],
      releasedAt: null,
    });
  });

  test("the customer message names the stock left, or that the item is sold out", () => {
    assert.equal(stockProblemMessage({ shortages: [{ productId: "s1", name: "Serum", requested: 3, available: 1 }], unavailable: [] }), "Only 1 of Serum left. Lower the quantity in your bag and try again.");
    assert.equal(stockProblemMessage({ shortages: [{ productId: "s1", name: "Serum", requested: 3, available: 0 }], unavailable: [] }), "Serum is sold out. Remove it from your bag and try again.");
    assert.match(stockProblemMessage({ shortages: [], unavailable: ["x"] }), /no longer available/);
  });
});
