import { test } from "node:test";
import assert from "node:assert/strict";
import { isFreshEventOrder, MAX_EVENT_AGE_MS, QUIET_MS } from "@/glowvai-app/core/notifications/orderPopupGuards";

test("an order created 6 days ago is never fresh enough for a dialog", () => {
  const now = Date.now();
  assert.equal(isFreshEventOrder(now - 6 * 24 * 3600 * 1000, now), false);
});

test("an order created an hour ago is fresh", () => {
  const now = Date.now();
  assert.equal(isFreshEventOrder(now - 3600 * 1000, now), true);
  assert.equal(isFreshEventOrder(now - MAX_EVENT_AGE_MS - 1, now), false);
});

test("missing or invalid created time is treated as old", () => {
  assert.equal(isFreshEventOrder(undefined), false);
  assert.equal(isFreshEventOrder(0), false);
  assert.equal(isFreshEventOrder("abc"), false);
});

test("the quiet window is a few seconds, not zero", () => {
  assert.ok(QUIET_MS >= 10_000 && QUIET_MS <= 60_000);
});
