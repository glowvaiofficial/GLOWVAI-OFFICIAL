import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { activeDelay, deliveryCodeResponse, codeVisibleAt, liveTrackingView } from "../../lib/shop/tracking";
import { validateDelayInput, validateDelayActor, DELAY_MAX_AHEAD_MS, DELAY_BANNER_TTL_MS, isDelayReason } from "../../lib/shop/delayRules";

const NOW = Date.UTC(2026, 10, 7, 12, 0);

describe("delay validation", () => {
  test("accepts each reason with a time in the next hour", () => {
    for (const reason of ["TRAFFIC", "STORE_BUSY", "RAIN"]) {
      const r = validateDelayInput(reason, NOW + 60 * 60_000, NOW);
      assert.equal(r.ok, true, reason);
    }
  });

  test("refuses a reason that is not on the list", () => {
    for (const reason of ["traffic", "LATE", "", null, undefined, 3, "TRAFFIC; DROP"]) {
      assert.equal(validateDelayInput(reason, NOW + 60_000, NOW).ok, false, String(reason));
    }
    assert.equal(isDelayReason("RAIN"), true);
    assert.equal(isDelayReason("SNOW"), false);
  });

  test("refuses a time that is not in the future", () => {
    assert.equal(validateDelayInput("TRAFFIC", NOW, NOW).ok, false);
    assert.equal(validateDelayInput("TRAFFIC", NOW - 1, NOW).ok, false);
  });

  test("accepts exactly 3 hours ahead and refuses one millisecond more", () => {
    assert.equal(validateDelayInput("RAIN", NOW + DELAY_MAX_AHEAD_MS, NOW).ok, true);
    assert.equal(validateDelayInput("RAIN", NOW + DELAY_MAX_AHEAD_MS + 1, NOW).ok, false);
  });

  test("refuses a time that is not a whole millisecond number", () => {
    for (const t of ["2026-11-07T13:00:00Z", NOW + 0.5, Number.NaN, null, undefined]) {
      assert.equal(validateDelayInput("TRAFFIC", t, NOW).ok, false, String(t));
    }
  });

  test("the 3-hour cap is the delay cap and the banner window", () => {
    assert.equal(DELAY_MAX_AHEAD_MS, 3 * 60 * 60_000);
    assert.equal(DELAY_BANNER_TTL_MS, 3 * 60 * 60_000);
  });

  test("the actor must be staff with a uid and a name", () => {
    assert.equal(validateDelayActor({ role: "STAFF", uid: "staffUid123", name: "Admin" }).ok, true);
    assert.equal(validateDelayActor({ role: "CUSTOMER", uid: "staffUid123", name: "Admin" }).ok, false);
    assert.equal(validateDelayActor({ role: "STAFF", uid: "x", name: "Admin" }).ok, false);
    assert.equal(validateDelayActor({ role: "STAFF", uid: "staffUid123", name: "  " }).ok, false);
    assert.equal(validateDelayActor(null).ok, false);
  });
});

describe("banner expiry", () => {
  const delay = (setAt: number) => ({ reason: "TRAFFIC", newArrivalAt: NOW + 30 * 60_000, setBy: "staffUid123", setAt });

  test("shows while set", () => {
    assert.ok(activeDelay(delay(NOW), NOW + 1000));
  });

  test("still shows at exactly 3 hours, and hides one millisecond later", () => {
    assert.ok(activeDelay(delay(NOW), NOW + DELAY_BANNER_TTL_MS));
    assert.equal(activeDelay(delay(NOW), NOW + DELAY_BANNER_TTL_MS + 1), null);
  });

  test("no record, or a malformed one, shows nothing", () => {
    assert.equal(activeDelay(undefined, NOW), null);
    assert.equal(activeDelay({ reason: "SNOW", newArrivalAt: NOW, setAt: NOW }, NOW), null);
    assert.equal(activeDelay({ reason: "RAIN", newArrivalAt: "soon", setAt: NOW }, NOW), null);
  });

  test("an order that is delivered shows no banner even while the record is fresh", () => {
    const order = { status: "DELIVERED", delay: delay(NOW), userId: "u" };
    const view = liveTrackingView({ order, overlay: null, orderId: "GV-1", now: NOW, rider: null, riderFirstName: null, store: null, storePhone: null });
    assert.equal(view.delay, null);
  });
});

describe("delivery code visibility by stage", () => {
  test("only stage 8 may show the code", () => {
    for (let s = 1; s <= 9; s++) assert.equal(codeVisibleAt(s), s === 8, `stage ${s}`);
    assert.equal(codeVisibleAt(null), false);
  });

  test("any other stage returns {available: false} and no code", () => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 9, null]) {
      const r = deliveryCodeResponse(s, "4821");
      assert.deepEqual(r, { available: false });
      assert.equal("code" in r, false);
    }
  });

  test("stage 8 returns the code when it is four digits", () => {
    assert.deepEqual(deliveryCodeResponse(8, "4821"), { available: true, code: "4821", locked: false, lockedMinutes: 0 });
  });

  test("stage 8 with a missing or malformed code is unavailable", () => {
    assert.deepEqual(deliveryCodeResponse(8, null), { available: false });
    assert.deepEqual(deliveryCodeResponse(8, "123"), { available: false });
    assert.deepEqual(deliveryCodeResponse(8, "12345"), { available: false });
  });

  test("a locked code reports the minutes to wait", () => {
    assert.deepEqual(deliveryCodeResponse(8, "4821", { locked: true, lockedMinutes: 12 }), { available: true, code: "4821", locked: true, lockedMinutes: 12 });
  });
});
