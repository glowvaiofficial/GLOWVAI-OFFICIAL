import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BODY_MAX, BODY_MIN, EDIT_WINDOW_MS, TITLE_MAX, canCreateReview, canEditReview, parseRating, validateReviewInput } from "../../lib/shop/reviewRules";

// Varied ordinary words (no run of the same word or letter), so the content filter reads them as a real review.
const WORDS = ["calm", "skin", "morning", "routine", "gentle", "texture", "light", "absorbs", "fast", "bottle", "summer", "humid", "climate", "oily", "dry", "patch", "night", "serum", "value", "daily", "soft", "clean", "finish", "tone", "barrier", "pores", "glow", "comfort", "bright", "simple"];
const prose = (n: number) => Array.from({ length: n }, (_, i) => WORDS[(i * 7) % WORDS.length]).join(" ");

const ok = (over: Partial<{ rating: unknown; title: unknown; body: unknown }> = {}) =>
  validateReviewInput({ rating: 4, title: "Lovely texture", body: "Absorbs well and my skin feels calm after a week.", ...over });

describe("rating validation", () => {
  test("whole numbers from 1 to 5 are accepted, as numbers or single-digit strings", () => {
    for (const v of [1, 2, 3, 4, 5, "1", "5"]) assert.equal(parseRating(v), Number(v));
  });

  test("fractions, zero, six, negatives, words and blanks are refused", () => {
    for (const v of [0, 6, -1, 2.5, 4.0001, "4.5", "", "  ", "five", null, undefined, true, NaN, Infinity]) {
      assert.equal(parseRating(v), null, `expected ${String(v)} to be refused`);
    }
  });

  test("an invalid rating is reported and nothing else is returned", () => {
    const r = ok({ rating: 7 });
    assert.equal(r.ok, false);
  });
});

describe("review text rules (existing server rules)", () => {
  test("the title is optional and capped at 80 characters", () => {
    assert.equal(ok({ title: "" }).ok, true);
    assert.equal(ok({ title: prose(20).slice(0, TITLE_MAX).trim() }).ok, true);
    assert.equal(ok({ title: prose(20).slice(0, TITLE_MAX) + "calm" }).ok, false);
  });

  test("the body is 10 to 1000 characters after trimming", () => {
    assert.equal(ok({ body: prose(3).slice(0, BODY_MIN - 1) }).ok, false);
    assert.equal(ok({ body: "  " + prose(3).slice(0, BODY_MIN) + "  " }).ok, true);
    assert.equal(ok({ body: prose(200).slice(0, BODY_MAX) }).ok, true);
    assert.equal(ok({ body: prose(200).slice(0, BODY_MAX) + " calm" }).ok, false);
  });

  test("a low rating (1 or 2) needs a body", () => {
    for (const rating of [1, 2]) {
      const r = validateReviewInput({ rating, title: "Not for me", body: "" });
      assert.equal(r.ok, false, `rating ${rating} without a body should be refused`);
    }
    assert.equal(ok({ rating: 2, body: "It broke me out in small bumps after two days." }).ok, true);
  });

  test("the server currently requires a body for every rating, so ratings 3 to 5 are refused without one too", () => {
    for (const rating of [3, 4, 5]) assert.equal(validateReviewInput({ rating, title: "", body: "" }).ok, false);
  });

  test("the title is trimmed and runs of spaces collapse", () => {
    const r = ok({ title: "  Great   value  " });
    assert.ok(r.ok);
    assert.equal(r.value.title, "Great value");
  });
});

describe("review eligibility window", () => {
  const posted = Date.parse("2026-11-01T10:00:00.000Z");

  test("a customer may edit once, within 7 days of posting", () => {
    assert.equal(canEditReview({ createdAtMs: posted, editCount: 0 }, posted + EDIT_WINDOW_MS - 1).ok, true);
    assert.equal(canEditReview({ createdAtMs: posted, editCount: 0 }, posted + EDIT_WINDOW_MS).ok, true);
    assert.deepEqual(canEditReview({ createdAtMs: posted, editCount: 0 }, posted + EDIT_WINDOW_MS + 1), { ok: false, reason: "EDIT_WINDOW_CLOSED" });
  });

  test("a second edit is refused even inside the window", () => {
    assert.deepEqual(canEditReview({ createdAtMs: posted, editCount: 1 }, posted + 1000), { ok: false, reason: "ALREADY_EDITED" });
  });

  test("a review needs a delivered order and no review of the product yet", () => {
    assert.deepEqual(canCreateReview(null, "ORD-1"), { ok: true });
    assert.deepEqual(canCreateReview(null, null), { ok: false, reason: "NOT_DELIVERED" });
    assert.deepEqual(canCreateReview({ createdAtMs: posted, editCount: 0 }, "ORD-1"), { ok: false, reason: "ALREADY_REVIEWED" });
  });
});
