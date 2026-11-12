import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseVendorPushToken, planVendorDevices, VENDOR_MAX_DEVICES, vendorPushTokenId } from "../../lib/vendor/pushToken";
import { tokenHash } from "../../lib/shop/notifications/policy";

const EXPO_TOKEN = "ExponentPushToken[abcdefghij1234567890]";
const FCM_TOKEN = "fcm-token_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-example";

describe("vendor push token body", () => {
  test("accepts EXPO and FCM tokens with a known platform", () => {
    assert.deepEqual(parseVendorPushToken({ token: EXPO_TOKEN, platform: "ios", tokenType: "EXPO" }), {
      ok: true,
      value: { token: EXPO_TOKEN, platform: "ios", tokenType: "EXPO" },
    });
    assert.equal(parseVendorPushToken({ token: FCM_TOKEN, platform: "android", tokenType: "FCM" }).ok, true);
  });

  test("the token must match its declared type (same rule as the customer API)", () => {
    const expoAsFcm = parseVendorPushToken({ token: EXPO_TOKEN, platform: "ios", tokenType: "FCM" });
    assert.equal(expoAsFcm.ok, false);
    const fcmAsExpo = parseVendorPushToken({ token: FCM_TOKEN, platform: "ios", tokenType: "EXPO" });
    assert.equal(fcmAsExpo.ok, false);
    assert.equal(parseVendorPushToken({ token: "short", platform: "ios", tokenType: "FCM" }).ok, false);
  });

  test("tokenType is required and must be EXPO or FCM", () => {
    const missing = parseVendorPushToken({ token: FCM_TOKEN, platform: "web" });
    assert.deepEqual(missing.ok === false && missing.field, "tokenType");
    assert.equal(parseVendorPushToken({ token: FCM_TOKEN, platform: "web", tokenType: "APNS" }).ok, false);
  });

  test("platform must be ios, android or web", () => {
    const res = parseVendorPushToken({ token: FCM_TOKEN, platform: "windows", tokenType: "FCM" });
    assert.deepEqual(res.ok === false && res.field, "platform");
    assert.equal(parseVendorPushToken(null).ok, false);
  });
});

describe("vendor device cap (max 3, oldest refreshed device dropped)", () => {
  const device = (n: number, updatedAt: number) => ({ id: tokenHash(`device-token-number-${n}-xxxxxxxx`), updatedAt });
  const tokenOf = (n: number) => `device-token-number-${n}-xxxxxxxx`;

  test("the cap is 3 devices", () => {
    assert.equal(VENDOR_MAX_DEVICES, 3);
  });

  test("a first, second and third device are all kept", () => {
    assert.deepEqual(planVendorDevices([], tokenOf(1)), { evict: [], devices: 1 });
    assert.deepEqual(planVendorDevices([device(1, 1)], tokenOf(2)), { evict: [], devices: 2 });
    assert.deepEqual(planVendorDevices([device(1, 1), device(2, 2)], tokenOf(3)), { evict: [], devices: 3 });
  });

  test("a fourth device evicts the least recently refreshed one and the count stays at 3", () => {
    const existing = [device(1, 30), device(2, 10), device(3, 20)];
    const plan = planVendorDevices(existing, tokenOf(4));
    assert.deepEqual(plan.evict, [device(2, 10).id]);
    assert.equal(plan.devices, 3);
  });

  test("re-registering a device that is already stored does not evict anything", () => {
    const existing = [device(1, 30), device(2, 10), device(3, 20)];
    const plan = planVendorDevices(existing, tokenOf(2));
    assert.deepEqual(plan.evict, []);
    assert.equal(plan.devices, 3);
  });

  test("a vendor over the cap from an earlier write is brought back down to 3", () => {
    const existing = [device(1, 1), device(2, 2), device(3, 3), device(4, 4)];
    const plan = planVendorDevices(existing, tokenOf(5));
    assert.equal(plan.evict.length, 2);
    assert.equal(plan.devices, 3);
  });
});

describe("vendor push token hashing", () => {
  test("the document id is the SHA-256 (hex) of the token, not the token", () => {
    const id = vendorPushTokenId(FCM_TOKEN);
    assert.equal(id, createHash("sha256").update(FCM_TOKEN, "utf8").digest("hex"));
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(id.includes(FCM_TOKEN), false);
    assert.equal(vendorPushTokenId(EXPO_TOKEN) === vendorPushTokenId(FCM_TOKEN), false);
  });

  test("the same token always maps to the same document, so a refresh does not add a device", () => {
    assert.equal(vendorPushTokenId(EXPO_TOKEN), vendorPushTokenId(EXPO_TOKEN));
  });
});
