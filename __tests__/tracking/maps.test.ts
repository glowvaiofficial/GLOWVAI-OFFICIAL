import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MAP_NOT_SET_UP_TEXT, RIDER_REFRESH_MS, mapsKeyFrom, mapsScriptUrl, riderRefreshDue, shouldFollowRider } from "../../glowvai-app/features/orders/trackingMapRules";

describe("map key absent", () => {
  test("no key means the map is not set up", () => {
    assert.equal(mapsKeyFrom(undefined), null);
    assert.equal(mapsKeyFrom(null), null);
    assert.equal(mapsKeyFrom(""), null);
    assert.equal(mapsKeyFrom("   "), null);
  });

  test("a value that is not a key shape counts as not set", () => {
    assert.equal(mapsKeyFrom("short"), null);
    assert.equal(mapsKeyFrom("has spaces in it and more than twenty chars"), null);
    assert.equal(mapsKeyFrom("AIza<script>alert(1)</script>xxxx"), null);
  });

  test("the card text when there is no key is exact", () => {
    assert.equal(MAP_NOT_SET_UP_TEXT, "Live map will appear once maps are set up");
  });

  test("a key of the right shape is accepted and trimmed", () => {
    const key = "AIzaSyD-test_key_1234567890abcdef";
    assert.equal(mapsKeyFrom(`  ${key}  `), key);
  });
});

describe("maps script", () => {
  test("the script is the Maps JavaScript API, with the key encoded", () => {
    const url = mapsScriptUrl("AIzaSyD-test_key_1234567890abcdef");
    assert.ok(url.startsWith("https://maps.googleapis.com/maps/api/js?key=AIzaSyD-test_key_1234567890abcdef"));
  });
});

describe("rider marker refresh", () => {
  test("the marker may move at most every 30 seconds", () => {
    assert.equal(RIDER_REFRESH_MS, 30_000);
    assert.equal(riderRefreshDue(0, 29_999), false);
    assert.equal(riderRefreshDue(0, 30_000), true);
    assert.equal(riderRefreshDue(1_000, 40_000), true);
  });

  test("only an order that is out for delivery follows the rider", () => {
    assert.equal(shouldFollowRider("OUT_FOR_DELIVERY"), true);
    assert.equal(shouldFollowRider("out_for_delivery"), true);
    for (const s of ["PLACED", "PACKED", "DELIVERED", "CANCELLED", null, undefined]) assert.equal(shouldFollowRider(s), false, String(s));
  });
});
