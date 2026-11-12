import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEVICE_CAP,
  SIGHTING_MIN_GAP_MS,
  coarseDeviceName,
  deviceHash,
  isDeviceHash,
  isDeviceId,
  planSighting,
  sortDevices,
  type KnownDevice,
} from "../../lib/shop/privacy/rules";

const ID = "abcDEF_123-456789XYZ";
const MIN = 60_000;

const fleet = (n: number, startAt = 1_000_000): KnownDevice[] =>
  Array.from({ length: n }, (_, i) => ({ hash: `h${String(i).padStart(2, "0")}`, firstSeenAt: startAt, lastSeenAt: startAt + i * MIN }));

describe("device key", () => {
  test("is a 64-character hex digest that is salted by the account", () => {
    const a = deviceHash("uid_one", ID);
    const b = deviceHash("uid_two", ID);
    assert.match(a, /^[a-f0-9]{64}$/);
    assert.notEqual(a, b, "same device id on two accounts must give two keys");
    assert.equal(a, deviceHash("uid_one", ID), "stable for one account");
    assert.ok(!a.includes(ID), "the raw device id is not in the key");
  });

  test("device ids must be 16 to 64 safe characters", () => {
    assert.equal(isDeviceId(ID), true);
    assert.equal(isDeviceId("short"), false);
    assert.equal(isDeviceId("has spaces in it here"), false);
    assert.equal(isDeviceId("x".repeat(65)), false);
    assert.equal(isDeviceId(undefined), false);
    assert.equal(isDeviceHash(deviceHash("u", ID)), true);
    assert.equal(isDeviceHash("not-a-hash"), false);
  });
});

describe("device sightings: cap and eviction", () => {
  test("the cap is ten devices", () => {
    assert.equal(DEVICE_CAP, 10);
  });

  test("a new device under the cap is created with nothing evicted", () => {
    assert.deepEqual(planSighting(fleet(3), "new", 5_000_000), { kind: "create", evict: [] });
  });

  test("an account at the cap evicts the least recently seen device", () => {
    assert.deepEqual(planSighting(fleet(DEVICE_CAP), "new", 5_000_000), { kind: "create", evict: ["h00"] });
  });

  test("eviction picks the oldest by last seen, not by first seen or list order", () => {
    const devices: KnownDevice[] = [
      { hash: "a", firstSeenAt: 1, lastSeenAt: 900 },
      { hash: "b", firstSeenAt: 2, lastSeenAt: 100 },
      ...Array.from({ length: 8 }, (_, i) => ({ hash: `c${i}`, firstSeenAt: 0, lastSeenAt: 1000 + i })),
    ];
    assert.deepEqual(planSighting(devices, "new", 5_000), { kind: "create", evict: ["b"] });
  });

  test("the list never grows past the cap, even when already over it", () => {
    const over = fleet(DEVICE_CAP + 2);
    const plan = planSighting(over, "new", 9_000_000);
    assert.equal(plan.kind, "create");
    if (plan.kind === "create") assert.ok(over.length - plan.evict.length + 1 <= DEVICE_CAP);
  });

  test("a known device is never evicted by its own sighting", () => {
    assert.deepEqual(planSighting(fleet(DEVICE_CAP), "h09", 99_000_000), { kind: "touch" });
  });
});

describe("device sightings: last seen written at most every 10 minutes", () => {
  const devices: KnownDevice[] = [{ hash: "me", firstSeenAt: 0, lastSeenAt: 1_000_000 }];

  test("the gap is ten minutes", () => {
    assert.equal(SIGHTING_MIN_GAP_MS, 10 * MIN);
  });

  test("a repeat inside 10 minutes writes nothing", () => {
    assert.deepEqual(planSighting(devices, "me", 1_000_000 + 9 * MIN), { kind: "none" });
  });

  test("a repeat after 10 minutes refreshes last seen", () => {
    assert.deepEqual(planSighting(devices, "me", 1_000_000 + 10 * MIN), { kind: "touch" });
  });
});

describe("device list order and names", () => {
  test("most recently seen first", () => {
    assert.deepEqual(sortDevices([{ lastSeenAt: 1 }, { lastSeenAt: 3 }, { lastSeenAt: 2 }]).map((d) => d.lastSeenAt), [3, 2, 1]);
  });

  test("names are coarse: browser and system, never a version or model", () => {
    const uas = [
      "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.61",
    ];
    for (const ua of uas) {
      const name = coarseDeviceName(ua);
      assert.doesNotMatch(name, /\d|SM-S911B|Mozilla/);
    }
  });
});
