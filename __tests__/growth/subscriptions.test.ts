import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  firstRunAt,
  nextRunAfter,
  retryAfterSkip,
  runDateKey,
  runItemPath,
  runPath,
  runSubscriptionCycle,
  subscriptionOrderId,
  transition,
  validateSubscriptionInput,
  type CycleOutcome,
} from "../../lib/shop/growth/subscriptions";
import { MemoryRepo } from "./memoryRepo";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
// 2026-11-06 08:30 IST (03:00 UTC): the daily run's calendar day is 2026-11-06.
const NOW = Date.UTC(2026, 10, 6, 3, 0);
const RUN_DATE = "2026-11-06";

describe("subscription input", () => {
  test("a product, a quantity from 1 to 5 and an interval of 2, 4 or 8 weeks are accepted", () => {
    assert.deepEqual(validateSubscriptionInput({ productId: "p1", quantity: 2, intervalWeeks: 4 }), {
      ok: true,
      value: { productId: "p1", quantity: 2, intervalWeeks: 4 },
    });
  });

  test("other quantities, intervals and an empty product are refused", () => {
    for (const quantity of [0, 6, 1.5, "x"]) {
      assert.equal(validateSubscriptionInput({ productId: "p1", quantity, intervalWeeks: 2 }).ok, false, `quantity ${String(quantity)}`);
    }
    for (const intervalWeeks of [1, 3, 12, "4 weeks"]) {
      assert.equal(validateSubscriptionInput({ productId: "p1", quantity: 1, intervalWeeks }).ok, false, `interval ${String(intervalWeeks)}`);
    }
    assert.equal(validateSubscriptionInput({ productId: "  ", quantity: 1, intervalWeeks: 2 }).ok, false);
  });
});

describe("subscription next-run maths", () => {
  test("the first delivery is one interval after the subscription starts", () => {
    assert.equal(firstRunAt(NOW, 2), NOW + 2 * WEEK);
    assert.equal(firstRunAt(NOW, 8), NOW + 8 * WEEK);
  });

  test("a run on time moves the next run exactly one interval on", () => {
    const due = NOW;
    assert.equal(nextRunAfter(due, 4, NOW), due + 4 * WEEK);
  });

  test("a late run keeps the cadence and never lands in the past", () => {
    const due = NOW - 3 * WEEK;
    const next = nextRunAfter(due, 2, NOW);
    assert.ok(next > NOW, "next run is in the future");
    assert.equal((next - due) % (2 * WEEK), 0, "still on the original cadence");
    assert.ok(next - NOW <= 2 * WEEK, "no more than one interval ahead");
  });

  test("a missing next-run time starts a fresh interval from now", () => {
    assert.equal(nextRunAfter(null, 8, NOW), NOW + 8 * WEEK);
  });

  test("a skipped run is retried one day later", () => {
    assert.equal(retryAfterSkip(NOW), NOW + DAY);
  });

  test("runs are keyed on the Indian calendar day", () => {
    // 20:00 UTC on 6 Nov is 01:30 IST on 7 Nov.
    assert.equal(runDateKey(Date.UTC(2026, 10, 6, 20, 0)), "2026-11-07");
    assert.equal(runDateKey(NOW), RUN_DATE);
  });

  test("an order id is stable for one subscription on one day, and differs across days or subscriptions", () => {
    const id = subscriptionOrderId("sub_a", RUN_DATE);
    assert.match(id, /^GV-261106-[0-9A-F]{6}$/);
    assert.equal(subscriptionOrderId("sub_a", RUN_DATE), id);
    assert.notEqual(subscriptionOrderId("sub_a", "2026-11-07"), id);
    assert.notEqual(subscriptionOrderId("sub_b", RUN_DATE), id);
  });
});

describe("pause, resume, quantity and cancel", () => {
  test("only an active subscription can be paused, and a pause stops it being due", () => {
    const t = transition({ status: "ACTIVE", intervalWeeks: 2 }, "pause", NOW);
    assert.equal(t.ok && t.patch.status, "PAUSED");
    assert.equal(t.ok && t.patch.nextRunAt, null);
    assert.equal(transition({ status: "PAUSED", intervalWeeks: 2 }, "pause", NOW).ok, false);
  });

  test("resume sets the next run one interval ahead, and only from paused", () => {
    const t = transition({ status: "PAUSED", intervalWeeks: 4 }, "resume", NOW);
    assert.equal(t.ok && t.patch.status, "ACTIVE");
    assert.equal(t.ok && t.patch.nextRunAt, NOW + 4 * WEEK);
    assert.equal(transition({ status: "ACTIVE", intervalWeeks: 4 }, "resume", NOW).ok, false);
  });

  test("the quantity can change while active or paused, within 1 to 5", () => {
    assert.deepEqual(transition({ status: "ACTIVE", intervalWeeks: 2 }, "quantity", NOW, { quantity: 3 }), { ok: true, patch: { quantity: 3 } });
    assert.equal(transition({ status: "ACTIVE", intervalWeeks: 2 }, "quantity", NOW, { quantity: 6 }).ok, false);
    assert.equal(transition({ status: "CANCELLED", intervalWeeks: 2 }, "quantity", NOW, { quantity: 2 }).ok, false);
  });

  test("cancelling ends the subscription for good", () => {
    const t = transition({ status: "PAUSED", intervalWeeks: 2 }, "cancel", NOW);
    assert.equal(t.ok && t.patch.status, "CANCELLED");
    assert.equal(transition({ status: "CANCELLED", intervalWeeks: 2 }, "cancel", NOW).ok, false);
    assert.equal(transition({ status: "CANCELLED", intervalWeeks: 2 }, "resume", NOW).ok, false);
  });
});

// Seeds a subscription that is due (or not) on the test day.
function seedSub(repo: MemoryRepo, id: string, overrides: Record<string, unknown> = {}) {
  repo.seed(`subscriptions/${id}`, {
    id,
    uid: `uid-${id}`,
    productId: `prod-${id}`,
    productName: "Test serum",
    quantity: 1,
    intervalWeeks: 2,
    status: "ACTIVE",
    nextRunAt: NOW - 1000,
    address: { name: "Test Customer", phone: "9876543210", fullAddress: "12 Test Street", city: "Hyderabad", pincode: "500001", area: "", landmark: "" },
    ...overrides,
  });
}

function recorder(outcomes: Record<string, CycleOutcome | "throw">) {
  const calls: Array<{ id: string; orderId: string }> = [];
  const createOrder = async (sub: { id: string }, orderId: string): Promise<CycleOutcome> => {
    calls.push({ id: sub.id, orderId });
    const o = outcomes[sub.id] ?? { ok: true as const, orderId };
    if (o === "throw") throw new Error("boom");
    return o;
  };
  return { calls, createOrder };
}

describe("daily subscription run (stub store)", () => {
  test("creates orders for due subscriptions, skips with a recorded reason, and advances the next run", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    seedSub(repo, "sub_b");
    seedSub(repo, "sub_c");
    seedSub(repo, "sub_paused", { status: "PAUSED", nextRunAt: null });
    seedSub(repo, "sub_future", { nextRunAt: NOW + DAY });
    const { calls, createOrder } = recorder({
      sub_b: { ok: false, code: "PRODUCT_NOT_PUBLISHED" },
      sub_c: { ok: false, code: "OUT_OF_STOCK" },
    });

    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-1", createOrder });

    assert.equal(summary.status, "RAN");
    assert.equal(summary.processed, 3);
    assert.equal(summary.created, 1);
    assert.deepEqual(summary.skipped, { PRODUCT_NOT_PUBLISHED: 1, OUT_OF_STOCK: 1 });
    assert.deepEqual(calls.map((c) => c.id).sort(), ["sub_a", "sub_b", "sub_c"]);
    assert.ok(calls.every((c) => c.orderId === subscriptionOrderId(c.id, RUN_DATE)));

    assert.equal(repo.data("subscriptions/sub_a")?.nextRunAt, nextRunAfter(NOW - 1000, 2, NOW));
    assert.equal(repo.data("subscriptions/sub_a")?.lastOrderId, subscriptionOrderId("sub_a", RUN_DATE));
    assert.equal(repo.data("subscriptions/sub_b")?.nextRunAt, NOW + DAY);
    assert.equal(repo.data("subscriptions/sub_b")?.lastSkipReason, "PRODUCT_NOT_PUBLISHED");
    assert.equal(repo.data("subscriptions/sub_c")?.lastSkipReason, "OUT_OF_STOCK");
    assert.equal(repo.data("subscriptions/sub_paused")?.nextRunAt, null);
    assert.equal(repo.data(runPath(RUN_DATE))?.status, "DONE");
  });

  test("a second run on the same day does nothing", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    const first = recorder({});
    await runSubscriptionCycle({ repo, now: NOW, runId: "run-1", createOrder: first.createOrder });
    const second = recorder({});
    const summary = await runSubscriptionCycle({ repo, now: NOW + 60_000, runId: "run-2", createOrder: second.createOrder });
    assert.equal(summary.status, "ALREADY_RAN");
    assert.equal(second.calls.length, 0);
    assert.equal(first.calls.length, 1);
  });

  test("a run still in progress is not started a second time", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    repo.seed(runPath(RUN_DATE), { status: "RUNNING", lockedUntil: NOW + 60_000 });
    const rec = recorder({});
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-2", createOrder: rec.createOrder });
    assert.equal(summary.status, "BUSY");
    assert.equal(rec.calls.length, 0);
  });

  test("an expired lock is taken over and the run completes", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    repo.seed(runPath(RUN_DATE), { status: "RUNNING", lockedUntil: NOW - 1 });
    const rec = recorder({});
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-2", createOrder: rec.createOrder });
    assert.equal(summary.status, "RAN");
    assert.equal(summary.created, 1);
  });

  test("a subscription already recorded for today is not charged again after a crash", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    repo.seed(runItemPath(RUN_DATE, "sub_a"), { status: "CREATED", orderId: subscriptionOrderId("sub_a", RUN_DATE) });
    const rec = recorder({});
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-2", createOrder: rec.createOrder });
    assert.equal(rec.calls.length, 0);
    assert.equal(summary.created, 0);
  });

  test("an order that already exists for today counts as created, and the next run moves on", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    const rec = recorder({ sub_a: { ok: false, code: "DUPLICATE" } });
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-1", createOrder: rec.createOrder });
    assert.equal(summary.created, 1);
    assert.equal(repo.data("subscriptions/sub_a")?.nextRunAt, nextRunAfter(NOW - 1000, 2, NOW));
    assert.equal(repo.data(runItemPath(RUN_DATE, "sub_a"))?.status, "CREATED");
  });

  test("an unexpected failure is recorded as an error and the run carries on", async () => {
    const repo = new MemoryRepo();
    seedSub(repo, "sub_a");
    seedSub(repo, "sub_b");
    const rec = recorder({ sub_a: "throw" });
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-1", createOrder: rec.createOrder });
    assert.equal(summary.created, 1);
    assert.deepEqual(summary.skipped, { ERROR: 1 });
    assert.equal(repo.data("subscriptions/sub_a")?.lastSkipReason, "ERROR");
  });

  test("at most 50 subscriptions are processed in one run", async () => {
    const repo = new MemoryRepo();
    for (let i = 0; i < 55; i++) seedSub(repo, `sub_${String(i).padStart(2, "0")}`);
    const rec = recorder({});
    const summary = await runSubscriptionCycle({ repo, now: NOW, runId: "run-1", createOrder: rec.createOrder });
    assert.equal(summary.processed, 50);
    assert.equal(summary.created, 50);
    assert.equal(rec.calls.length, 50);
  });
});
