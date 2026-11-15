import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideReady } from "../../lib/vendor/fulfilment";
import { chunkIds, vendorReturnView } from "../../lib/vendor/returns";
import { orderTimeline } from "../../lib/vendor/vendorView";
import { toVendorOrder } from "../../lib/vendor/orders";
import { tabOf } from "../../lib/vendor-web/ops/merge";
import { returnReasonLabel, returnStatusLabel } from "../../lib/vendor-web/ops/returns";
import { canSave, shouldWarnOnLeave } from "../../lib/vendor-web/ops/unsaved";
import type { OpsOrder } from "../../lib/vendor-web/ops/types";

describe("ready for pickup transition", () => {
  test("packed moves to ready", () => assert.deepEqual(decideReady({ status: "PACKED" }, false), { kind: "apply" }));
  test("already ready is an idempotent no-op", () => assert.deepEqual(decideReady({ status: "READY_FOR_PICKUP" }, false), { kind: "noop" }));
  test("invalid sources are refused", () => {
    for (const status of ["PLACED", "VENDOR_ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", ""]) {
      assert.deepEqual(decideReady({ status }, false), { kind: "refuse", code: "INVALID_STATE" });
    }
  });
  test("cancelled by customer or staff is refused", () => {
    assert.deepEqual(decideReady({ status: "CANCELLED" }, false), { kind: "refuse", code: "ORDER_CANCELLED" });
    assert.deepEqual(decideReady({ status: "PACKED" }, true), { kind: "refuse", code: "ORDER_CANCELLED" });
  });
  test("timeline and projection show the step only when recorded", () => {
    assert.deepEqual(orderTimeline({ vendorPackedAt: 1, vendorReadyAt: 2 }).map((s) => s.label), ["Packed", "Ready for pickup"]);
    assert.equal(orderTimeline({ vendorPackedAt: 1 }).some((s) => /ready|rider/i.test(s.label)), false);
    const o = toVendorOrder({ orderId: "o1", vendorUid: "u", status: "READY_FOR_PICKUP", vendorReadyAt: 5 }, { uid: "u", isOffer: false });
    assert.equal(o.readyAt, 5);
  });
  test("ready orders stay in the packed tab", () => assert.equal(tabOf({ status: "READY_FOR_PICKUP", isOffer: false, cancelled: false } as OpsOrder), "packed"));
});

describe("ready route follows the vendor pattern", () => {
  const src = readFileSync("app/api/vendor/orders/[orderId]/ready/route.ts", "utf8");
  test("uses wrapper, rate limits, transaction, scoping, audit event, validation", () => {
    for (const s of ["vendorRoute", "perMinute(", "runTransaction", "isMine(order, me.uid)", "events:", "ORDER_ID_RE", "NOT_APPROVED", "decideReady"]) assert.ok(src.includes(s), s);
    assert.ok(!/rider/i.test(src.replace(/no rider is assigned here/i, "")));
  });
  test("returns route is read only and scoped", () => {
    const r = readFileSync("app/api/vendor/returns/route.ts", "utf8");
    assert.ok(r.includes("vendorRoute") && r.includes('"vendorUid", "==", me.uid') && r.includes("export const GET"));
    assert.ok(!/export const (POST|PUT|PATCH|DELETE)/.test(r) && !/\.(update|set|delete)\(/.test(r));
  });
});

describe("returns view", () => {
  test("allow-list drops customer id and note, clamps unknown values", () => {
    const v = vendorReturnView({ orderId: "o1", uid: "secret", note: "call 9999999999", reason: "weird", status: "REFUNDED", type: "RETURN", items: [{ productId: "p", title: "T", quantity: 2, unitPrice: 9 }], createdAt: 3 }, "RT-1");
    assert.equal(JSON.stringify(v).includes("secret"), false);
    assert.equal(JSON.stringify(v).includes("9999"), false);
    assert.equal(v.reason, "DAMAGED");
    assert.equal(v.status, "REFUNDED");
  });
  test("chunks ids for in queries", () => assert.deepEqual(chunkIds(Array.from({ length: 31 }, (_, i) => String(i))).map((c) => c.length), [30, 1]));
  test("labels", () => {
    assert.equal(returnStatusLabel("REFUNDED"), "Refunded by GlowVai");
    assert.equal(returnReasonLabel("WRONG_ITEM"), "Wrong item");
  });
});

describe("unsaved edits", () => {
  test("save disabled with no change or while saving", () => {
    assert.equal(canSave(0, false), false);
    assert.equal(canSave(2, true), false);
    assert.equal(canSave(1, false), true);
  });
  test("warn only with unsaved changes", () => {
    assert.equal(shouldWarnOnLeave(0, false), false);
    assert.equal(shouldWarnOnLeave(1, false), true);
    assert.equal(shouldWarnOnLeave(1, true), false);
  });
});
