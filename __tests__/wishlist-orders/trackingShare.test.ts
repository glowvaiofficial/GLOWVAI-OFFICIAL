import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  SHARE_TOKEN_PATTERN,
  SHARE_TTL_MS,
  buildShareUrl,
  checkShareToken,
  hashShareToken,
  issueShareToken,
  publicTrackingView,
  shareRecordOf,
} from "../../lib/shop/trackingShare";

const NOW = Date.parse("2026-11-06T10:00:00.000Z");
const MIN = 60_000;

describe("share token generation and hashing", () => {
  test("a token is 32 random bytes, base64url, 43 characters", () => {
    const { token } = issueShareToken(NOW);
    assert.equal(token.length, 43);
    assert.ok(SHARE_TOKEN_PATTERN.test(token));
    assert.equal(Buffer.from(token, "base64url").length, 32);
  });

  test("two issues never give the same token or salt", () => {
    const a = issueShareToken(NOW);
    const b = issueShareToken(NOW);
    assert.notEqual(a.token, b.token);
    assert.notEqual(a.record.salt, b.record.salt);
  });

  test("the stored record holds a salted hash, never the token", () => {
    const { token, record } = issueShareToken(NOW);
    assert.equal(record.hash.length, 64);
    assert.ok(!JSON.stringify(record).includes(token));
    assert.equal(record.hash, hashShareToken(token, record.salt));
  });

  test("the same token under a different salt hashes differently", () => {
    const { token, record } = issueShareToken(NOW);
    assert.notEqual(hashShareToken(token, record.salt), hashShareToken(token, "00000000000000000000000000000000"));
  });

  test("a deterministic random source gives a deterministic record (used to pin the format)", () => {
    const fixed = (n: number) => Buffer.alloc(n, 7);
    const a = issueShareToken(NOW, fixed);
    const b = issueShareToken(NOW, fixed);
    assert.deepEqual(a, b);
    assert.equal(a.record.expiresAtMs, NOW + SHARE_TTL_MS);
  });
});

describe("share expiry and revocation", () => {
  const { token, record } = issueShareToken(NOW);

  test("the link opens with the right token before it expires", () => {
    assert.deepEqual(checkShareToken(token, record, NOW), { ok: true });
    assert.deepEqual(checkShareToken(token, record, NOW + SHARE_TTL_MS - MIN), { ok: true });
  });

  test("the link is valid for 48 hours and no longer after", () => {
    assert.equal(SHARE_TTL_MS, 48 * 60 * MIN);
    assert.deepEqual(checkShareToken(token, record, NOW + SHARE_TTL_MS), { ok: false, reason: "expired" });
    assert.deepEqual(checkShareToken(token, record, NOW + SHARE_TTL_MS + MIN), { ok: false, reason: "expired" });
  });

  test("a wrong token of the right shape is refused", () => {
    const other = issueShareToken(NOW).token;
    assert.deepEqual(checkShareToken(other, record, NOW), { ok: false, reason: "mismatch" });
  });

  test("a malformed token is refused before any comparison", () => {
    assert.deepEqual(checkShareToken("short", record, NOW), { ok: false, reason: "malformed" });
    assert.deepEqual(checkShareToken(undefined, record, NOW), { ok: false, reason: "malformed" });
    assert.deepEqual(checkShareToken(42, record, NOW), { ok: false, reason: "malformed" });
  });

  test("revoked (no record) and unknown orders are refused the same way", () => {
    assert.deepEqual(checkShareToken(token, null, NOW), { ok: false, reason: "missing" });
  });

  test("regenerating gives a new token and the old link stops working at once", () => {
    const again = issueShareToken(NOW + MIN);
    assert.deepEqual(checkShareToken(again.token, again.record, NOW + MIN), { ok: true });
    assert.deepEqual(checkShareToken(token, again.record, NOW + MIN), { ok: false, reason: "mismatch" });
  });

  test("a stored record round-trips through the order document, and malformed records count as no share", () => {
    assert.deepEqual(shareRecordOf(JSON.parse(JSON.stringify(record))), record);
    assert.equal(shareRecordOf({ hash: "zz", salt: "00", issuedAtMs: 1, expiresAtMs: 2 }), null);
    assert.equal(shareRecordOf(undefined), null);
    assert.equal(shareRecordOf("nope"), null);
  });
});

describe("share URL", () => {
  test("builds the canonical link", () => {
    assert.equal(buildShareUrl("ORD-20261106-AB12", "abc_DEF-123"), "https://glowvai.in/shop?track=ORD-20261106-AB12&k=abc_DEF-123");
  });

  test("encodes the order id and token so nothing can add parameters", () => {
    const url = buildShareUrl("ORD 1&k=x", "a&b");
    assert.equal(url, "https://glowvai.in/shop?track=ORD%201%26k%3Dx&k=a%26b");
    assert.equal(new URL(url).searchParams.get("k"), "a&b");
  });
});

describe("public tracking view", () => {
  const order = {
    orderId: "ORD-1",
    status: "OUT_FOR_DELIVERY",
    userId: "uid-customer-1",
    items: [{ productId: "p-1", productName: "Gentle Cleanser", quantity: 2, unitPrice: 499 }],
    shippingAddress: { recipientName: "Ravi Kumar", fullAddress: "12 MG Road, Flat 4B", city: "Pune", pincode: "411001", phone: "+919876543210" },
    contact: { phone: "+919876543210", email: "ravi@example.com" },
    deliveryCode: { hash: "secret-hash", createdAt: NOW, wrong: 0, lockedUntil: 0 },
    deliveryOtp: "4821",
    rider: { name: "Suresh Yadav", phone: "+919811122233", uid: "rider-9" },
    vendorId: "vendor-7",
    paymentId: "pay_123",
    events: [{ at: NOW, event: "Dispatched by store, call 9876543210", status: "DISPATCHED" }],
    deliverySlot: { from: NOW - 60 * MIN, to: NOW + 60 * MIN },
    createdAt: NOW - 3 * 60 * MIN,
  };
  const view = publicTrackingView(order, undefined, "ORD-1", NOW);
  const serialised = JSON.stringify(view);

  test("carries the stage, estimate, store name and rider first name while out for delivery", () => {
    assert.equal(view.status, "OUT_FOR_DELIVERY");
    assert.equal(view.storeName, "GlowVai");
    assert.equal(view.outForDelivery, true);
    assert.deepEqual(view.expectedWindow, { from: NOW - 60 * MIN, to: NOW + 60 * MIN });
    assert.equal(view.riderFirstName, "Suresh");
    assert.equal(view.liveLocation, false);
  });

  test("never contains the customer's name, phone, email, address, items, the OTP or internal ids", () => {
    for (const secret of ["Ravi", "Kumar", "98765", "ravi@example", "MG Road", "Gentle Cleanser", "4821", "secret-hash", "deliveryCode", "pay_123", "vendor-7", "uid-customer-1", "rider-9", "9811122233", "Pune", "411001"]) {
      assert.ok(!serialised.includes(secret), `public view leaked ${secret}`);
    }
    assert.ok(!("items" in view));
    assert.ok(!("shippingAddress" in view));
    assert.ok(!("rider" in view));
    assert.ok(!("events" in view));
  });

  test("the rider's first name is shown only while the order is out for delivery", () => {
    for (const status of ["PLACED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED"]) {
      const v = publicTrackingView({ ...order, status }, undefined, "ORD-1", NOW);
      assert.equal(v.riderFirstName, null, `no rider name at ${status}`);
    }
  });

  test("the rider's name is reduced to a first name and dropped when it is not a plain word", () => {
    assert.equal(publicTrackingView({ ...order, rider: { name: "suresh+91 98111" } }, undefined, "ORD-1", NOW).riderFirstName, null);
  });

  test("a delay banner appears only when the given window has passed and the order is still open", () => {
    assert.equal(view.delayed, false);
    const late = publicTrackingView(order, undefined, "ORD-1", NOW + 2 * 60 * MIN);
    assert.equal(late.delayed, true);
    assert.ok(late.delayText);
    const delivered = publicTrackingView({ ...order, status: "DELIVERED" }, undefined, "ORD-1", NOW + 2 * 60 * MIN);
    assert.equal(delivered.delayed, false);
    assert.equal(delivered.expectedWindow, null);
  });

  test("an admin cancellation overlay shows the order as cancelled", () => {
    const v = publicTrackingView(order, { fulfilment: "CANCELLED" }, "ORD-1", NOW);
    assert.equal(v.cancelled, true);
    assert.equal(v.outForDelivery, false);
    assert.equal(v.expectedWindow, null);
  });
});
