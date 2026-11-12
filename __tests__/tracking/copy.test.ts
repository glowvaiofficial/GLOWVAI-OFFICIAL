import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DELAY_COPY, STAGE_COPY, delayBanner, fillCopy, formatArrivalTime, stageCopy } from "../../lib/shop/tracking";
import { renderNotification, TEMPLATES, NOTIFICATION_TYPES } from "../../lib/shop/notifications/templates";

// Anything that could be personal: a phone number, an email, a link.
const PII = [/\d{7,}/, /@/, /https?:\/\//];

describe("stage copy: exact text", () => {
  test("stage titles and subtitles match the owner's text", () => {
    assert.deepEqual(STAGE_COPY[1], { title: "Order received!", subtitle: "We've got your order and are confirming it at our dark store." });
    assert.deepEqual(STAGE_COPY[2], { title: "Order confirmed", subtitle: "Your products are reserved at our dark store." });
    assert.deepEqual(STAGE_COPY[3], { title: "Collecting your products", subtitle: "Our team is picking your items at the dark store." });
    assert.deepEqual(STAGE_COPY[4], { title: "Packing your order", subtitle: "Checking each product and sealing it with care." });
    assert.deepEqual(STAGE_COPY[5], { title: "On the way", subtitle: "{riderFirstName} has picked up your order and is heading to you." });
    assert.deepEqual(STAGE_COPY[6], { title: "Almost there", subtitle: "{riderFirstName} is {distanceKm} km away from your location." });
    assert.deepEqual(STAGE_COPY[7], { title: "Arriving in 2 mins", subtitle: "Keep your phone handy, {riderFirstName} is nearby." });
    assert.deepEqual(STAGE_COPY[8], { title: "{riderFirstName} has arrived", subtitle: "Share OTP {deliveryCode} to collect your order." });
    assert.deepEqual(STAGE_COPY[9], { title: "Delivered!", subtitle: "Enjoy your glow. Not suited to your skin? Request a refund within 7 days." });
  });

  test("stage 5 uses the rider's first name", () => {
    assert.equal(stageCopy(5, { riderFirstName: "Ravi" }).subtitle, "Ravi has picked up your order and is heading to you.");
  });

  test("stage 6 shows the distance to one decimal", () => {
    assert.equal(stageCopy(6, { riderFirstName: "Ravi", distanceKm: 2.36 }).subtitle, "Ravi is 2.4 km away from your location.");
  });

  test("stage 7 keeps its exact wording", () => {
    assert.equal(stageCopy(7, { riderFirstName: "Ravi" }).subtitle, "Keep your phone handy, Ravi is nearby.");
  });

  test("stage 8 title and subtitle with the code", () => {
    const c = stageCopy(8, { riderFirstName: "Ravi", deliveryCode: "4821" });
    assert.equal(c.title, "Ravi has arrived");
    assert.equal(c.subtitle, "Share OTP 4821 to collect your order.");
  });

  test("stage 8 without the code never shows a placeholder", () => {
    const c = stageCopy(8, { riderFirstName: "Ravi", deliveryCode: null });
    assert.equal(c.subtitle, "Share your delivery OTP to collect your order.");
    assert.ok(!c.subtitle.includes("{"));
  });

  test("a missing rider name falls back to a neutral phrase, never a made-up name", () => {
    assert.equal(stageCopy(5, { riderFirstName: null }).subtitle, "Your delivery partner has picked up your order and is heading to you.");
  });

  test("no stage copy keeps a placeholder once its values are filled", () => {
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      const c = stageCopy(stage, { riderFirstName: "Ravi", distanceKm: 1.5, deliveryCode: "1234" });
      assert.ok(!/\{\w+\}/.test(c.title + c.subtitle), `stage ${stage}`);
    }
  });

  test("no stage copy carries personal details", () => {
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 9] as const) {
      const c = stageCopy(stage, { riderFirstName: "Ravi", distanceKm: 1.5 });
      for (const re of PII) assert.ok(!re.test(c.title + c.subtitle), `stage ${stage} matched ${re}`);
    }
  });
});

describe("delay copy: exact text", () => {
  test("the three delay messages match the owner's text", () => {
    assert.deepEqual(DELAY_COPY.TRAFFIC, { title: "Running a little late", body: "Heavy traffic on the way. New arrival time: {newArrivalTime}." });
    assert.deepEqual(DELAY_COPY.STORE_BUSY, { title: "Still packing your order", body: "We're making sure everything is perfect. Thanks for waiting." });
    assert.deepEqual(DELAY_COPY.RAIN, { title: "Delayed due to rain", body: "{riderFirstName} is riding safely to you. New arrival time: {newArrivalTime}." });
  });

  test("the banner fills the arrival time in India time", () => {
    // 13:15 UTC is 18:45 in India.
    const at = Date.UTC(2026, 10, 7, 13, 15);
    assert.equal(formatArrivalTime(at), "6:45 pm");
    const banner = delayBanner({ reason: "TRAFFIC", newArrivalAt: at }, null);
    assert.equal(banner?.body, "Heavy traffic on the way. New arrival time: 6:45 pm.");
  });

  test("the rain banner uses the rider's first name, or the neutral fallback", () => {
    const at = Date.UTC(2026, 10, 7, 13, 15);
    assert.equal(delayBanner({ reason: "RAIN", newArrivalAt: at }, "Ravi")?.body, "Ravi is riding safely to you. New arrival time: 6:45 pm.");
    assert.equal(delayBanner({ reason: "RAIN", newArrivalAt: at }, null)?.body, "Your delivery partner is riding safely to you. New arrival time: 6:45 pm.");
  });

  test("the store-busy banner has no placeholders", () => {
    const at = Date.UTC(2026, 10, 7, 13, 15);
    const banner = delayBanner({ reason: "STORE_BUSY", newArrivalAt: at }, null);
    assert.deepEqual(banner, { reason: "STORE_BUSY", title: "Still packing your order", body: "We're making sure everything is perfect. Thanks for waiting." });
  });

  test("fillCopy leaves a placeholder with no value visible", () => {
    assert.equal(fillCopy("Hi {name}, {other}", { name: "A" }), "Hi A, {other}");
  });
});

describe("in-app notification copy: exact, no placeholders, no personal details", () => {
  const expected: Record<string, [string, string]> = {
    tracking_confirmed: ["Order confirmed", "Your products are reserved at our dark store."],
    tracking_on_the_way: ["On the way", "Your order has been picked up and is heading to you."],
    tracking_almost_there: ["Almost there", "Your delivery partner is nearly on the way to you."],
    tracking_arriving: ["Arriving in 2 mins", "Keep your phone handy, your delivery partner is nearby."],
    tracking_arrived: ["Your delivery partner has arrived", "Open your order to see the delivery code."],
    tracking_delayed: ["Running a little late", "Your delivery is running a little late. Open your order for the new arrival time."],
  };

  for (const [type, [title, body]] of Object.entries(expected)) {
    test(type, () => {
      const r = renderNotification(type);
      assert.ok(r, "type is in the table");
      assert.equal(r.title, title);
      assert.equal(r.body, body);
      assert.equal(r.relatedType, "order");
      assert.equal(r.category, "orders");
      for (const re of [/\{/, ...PII]) assert.ok(!re.test(title + body), `matched ${re}`);
    });
  }

  test("the new types are listed in NOTIFICATION_TYPES and every type has copy", () => {
    for (const type of Object.keys(expected)) assert.ok((NOTIFICATION_TYPES as readonly string[]).includes(type));
    for (const type of NOTIFICATION_TYPES) assert.ok(TEMPLATES[type].title && TEMPLATES[type].body, type);
  });
});
