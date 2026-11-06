import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { IN_FLIGHT_MS, processRefund, type RefundProvider, type RefundStore } from "../../lib/shop/refundFlow";
import type { CreateRefundResult, RazorpayRefund, RefundEntry } from "../../lib/shop/refunds";

type Row = Record<string, unknown>;
const NOW = 1_762_400_000_000;

// In-memory orders with Firestore's dotted-key update semantics for "payment.status".
function memoryStore(orders: Record<string, Row>): RefundStore & { orders: Record<string, Row>; writes: number } {
  const s = {
    orders,
    writes: 0,
    async update<T>(orderId: string, fn: (order: Row | null) => { result: T; patch?: Row | null }): Promise<T> {
      const current = s.orders[orderId] ? structuredClone(s.orders[orderId]) : null;
      const { result, patch } = fn(current);
      if (patch && current) {
        s.writes += 1;
        const next: Row = { ...current };
        for (const [k, v] of Object.entries(patch)) {
          if (k.includes(".")) {
            const [a, b] = k.split(".");
            next[a] = { ...((next[a] as Row) ?? {}), [b]: v };
          } else next[k] = v;
        }
        s.orders[orderId] = next;
      }
      return result;
    },
  };
  return s;
}

function fakeProvider(answers: CreateRefundResult[], lookups: (RazorpayRefund | null | undefined)[] = []): RefundProvider & { creates: number; finds: number } {
  const p = {
    creates: 0,
    finds: 0,
    async create(): Promise<CreateRefundResult> {
      p.creates += 1;
      return answers.shift() ?? { ok: false, definite: false, message: "no answer" };
    },
    async find(): Promise<RazorpayRefund | null | undefined> {
      p.finds += 1;
      return lookups.shift();
    },
  };
  return p;
}

const order = (extra: Row = {}): Row => ({
  orderId: "GV-1",
  pricing: { grandTotal: 1000 },
  payment: { method: "ONLINE", status: "PAID", paymentId: "pay_1", transactionId: "pay_1" },
  events: [],
  updatedAt: 1,
  ...extra,
});

const req = { orderId: "GV-1", amountPaise: 40000, reason: "Damaged", requestId: "req-00000001" };
const refundsIn = (store: { orders: Record<string, Row> }) => store.orders["GV-1"].refunds as RefundEntry[];

describe("refund flow", () => {
  test("a refund is saved with Razorpay's id and the payment becomes partially refunded", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider([{ ok: true, refund: { id: "rfnd_1", status: "PENDING", amountPaise: 40000 } }]);
    const out = await processRefund(req, { store, provider, now: () => NOW });
    assert.equal(out.status, 200);
    assert.equal(out.body.ok, true);
    assert.equal((out.body.refund as Row).razorpayRefundId, "rfnd_1");
    assert.equal(out.body.paymentStatus, "PARTIALLY_REFUNDED");
    assert.equal(out.body.refundable, 600);
    const saved = refundsIn(store)[0];
    assert.deepEqual([saved.requestId, saved.razorpayRefundId, saved.amount, saved.status, saved.reason, saved.at], ["req-00000001", "rfnd_1", 400, "PENDING", "Damaged", NOW]);
    const o = store.orders["GV-1"];
    assert.equal((o.payment as Row).status, "PARTIALLY_REFUNDED");
    assert.equal(o.updatedAt, NOW);
    assert.equal((o.events as unknown[]).length, 2);
  });

  test("a repeat with the same requestId returns the saved result and does not call Razorpay again", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider([{ ok: true, refund: { id: "rfnd_1", status: "PROCESSED", amountPaise: 40000 } }]);
    const first = await processRefund(req, { store, provider, now: () => NOW });
    const second = await processRefund(req, { store, provider, now: () => NOW + 10 });
    assert.equal(provider.creates, 1);
    assert.deepEqual(second, first);
    assert.equal(refundsIn(store).length, 1);
  });

  test("the full amount marks the payment REFUNDED, and nothing more can be refunded", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider([{ ok: true, refund: { id: "rfnd_1", status: "PROCESSED", amountPaise: 100000 } }]);
    const out = await processRefund({ ...req, amountPaise: 100000 }, { store, provider, now: () => NOW });
    assert.equal(out.body.paymentStatus, "REFUNDED");
    const again = await processRefund({ ...req, requestId: "req-00000002", amountPaise: 100 }, { store, provider, now: () => NOW });
    assert.equal(again.status, 409);
    assert.equal(again.body.code, "NOTHING_TO_REFUND");
    assert.equal(provider.creates, 1);
  });

  test("a refusal from Razorpay is saved as FAILED and frees the amount", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider([{ ok: false, definite: true, message: "Insufficient balance" }]);
    const out = await processRefund(req, { store, provider, now: () => NOW });
    assert.equal(out.status, 502);
    assert.equal(out.body.code, "REFUND_FAILED");
    assert.equal(out.body.refundable, 1000);
    assert.equal(refundsIn(store)[0].status, "FAILED");
    assert.equal((store.orders["GV-1"].payment as Row).status, "PAID");
    // The same requestId keeps its failed result; a new one can try again.
    const repeat = await processRefund(req, { store, provider, now: () => NOW });
    assert.equal(repeat.body.code, "REFUND_FAILED");
    assert.equal(provider.creates, 1);
  });

  test("an unknown outcome is looked up before anything is sent again", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider(
      [{ ok: false, definite: false, message: "timeout" }],
      [{ id: "rfnd_7", status: "PROCESSED", amountPaise: 40000 }],
    );
    const first = await processRefund(req, { store, provider, now: () => NOW });
    assert.equal(first.body.code, "OUTCOME_UNKNOWN");
    assert.equal(refundsIn(store)[0].status, "REQUESTED");
    const retry = await processRefund(req, { store, provider, now: () => NOW + 5000 });
    assert.equal(retry.status, 200);
    assert.equal((retry.body.refund as Row).razorpayRefundId, "rfnd_7");
    assert.equal(provider.creates, 1);
    assert.equal(provider.finds, 1);
  });

  test("a REQUESTED refund not found at Razorpay is sent again only after it is no longer in flight", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider(
      [{ ok: false, definite: false, message: "timeout" }, { ok: true, refund: { id: "rfnd_8", status: "PENDING", amountPaise: 40000 } }],
      [null, null],
    );
    await processRefund(req, { store, provider, now: () => NOW });
    const soon = await processRefund(req, { store, provider, now: () => NOW + 1000 });
    assert.equal(soon.status, 202);
    assert.equal(provider.creates, 1);
    const later = await processRefund(req, { store, provider, now: () => NOW + IN_FLIGHT_MS + 1 });
    assert.equal(later.status, 200);
    assert.equal(provider.creates, 2);
    assert.equal(refundsIn(store).length, 1);
  });

  test("while one request is in flight, a second request cannot over-refund", async () => {
    const store = memoryStore({ "GV-1": order() });
    const provider = fakeProvider([{ ok: false, definite: false, message: "timeout" }]);
    await processRefund({ ...req, amountPaise: 80000 }, { store, provider, now: () => NOW });
    const other = await processRefund({ ...req, requestId: "req-00000002", amountPaise: 30000 }, { store, provider, now: () => NOW });
    assert.equal(other.status, 409);
    assert.equal(other.body.code, "AMOUNT_EXCEEDS_REFUNDABLE");
    assert.equal(other.body.refundable, 200);
  });

  test("COD orders are refused with COD_MANUAL_REFUND and nothing is written", async () => {
    const store = memoryStore({ "GV-1": order({ payment: { method: "COD", status: "PAID", paymentId: null } }) });
    const provider = fakeProvider([]);
    const out = await processRefund(req, { store, provider, now: () => NOW });
    assert.equal(out.status, 409);
    assert.equal(out.body.code, "COD_MANUAL_REFUND");
    assert.equal(store.writes, 0);
    assert.equal(provider.creates, 0);
  });
});
