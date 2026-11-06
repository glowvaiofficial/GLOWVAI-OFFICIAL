import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_MAX,

  EDIT_WINDOW_MS,
  EMPTY_TOTALS,
  applyDelta,
  averageOf,
  canCreateReview,
  canEditReview,
  decodeCursor,
  deliveredOrderFor,
  effectiveOrderStatus,
  encodeCursor,
  firstNameFor,
  ownReview,
  parseRating,
  parseSort,
  publicReview,
  summaryOf,
  totalsDelta,
  validateReviewInput,
  type OrderLike,
  type RatingTotals,
} from "../../lib/shop/reviewRules";
import { contentProblem } from "../../lib/shop/contentFilter";

const DAY = 24 * 60 * 60 * 1000;
const UID = "uid-customer-1";
// Ordinary text of any length, with no repeated letters or words in a row.
const prose = (n: number): string => "calm gentle cream for daily use with a light feel ".repeat(40).slice(0, n).replace(/ $/, "e");
const OTHER = "uid-customer-2";
const PRODUCT = "prod-min-spf50";
const OTHER_PRODUCT = "prod-min-salicylic-2";
const NOW = Date.parse("2026-11-06T10:00:00.000Z");

const order = (over: Partial<OrderLike> & { id: string }): OrderLike => ({
  userId: UID,
  status: "DELIVERED",
  items: [{ productId: PRODUCT, quantity: 1 }],
  ...over,
});

describe("verified purchase rule", () => {
  test("a delivered order of this customer that contains the product is enough", () => {
    assert.equal(deliveredOrderFor([order({ id: "GV-1" })], new Map(), UID, PRODUCT), "GV-1");
  });

  test("an order that is not delivered does not count", () => {
    for (const status of ["PLACED", "VENDOR_ACCEPTED", "SHIPPED", "CANCELLED"]) {
      assert.equal(deliveredOrderFor([order({ id: "GV-1", status })], new Map(), UID, PRODUCT), null, status);
    }
  });

  test("a staff overlay that says DELIVERED counts even when the shop status has not caught up", () => {
    const overlays = new Map([["GV-2", { fulfilment: "DELIVERED" }]]);
    assert.equal(deliveredOrderFor([order({ id: "GV-2", status: "PLACED" })], overlays, UID, PRODUCT), "GV-2");
  });

  test("a staff overlay that says CANCELLED stops an order from counting, even if it was delivered", () => {
    const overlays = new Map([["GV-3", { fulfilment: "CANCELLED" }]]);
    assert.equal(deliveredOrderFor([order({ id: "GV-3" })], overlays, UID, PRODUCT), null);
    assert.equal(effectiveOrderStatus("DELIVERED", { fulfilment: "CANCELLED" }), "CANCELLED");
  });

  test("an order of another customer does not count", () => {
    assert.equal(deliveredOrderFor([order({ id: "GV-4", userId: OTHER })], new Map(), UID, PRODUCT), null);
  });

  test("the product must be one of the order's items", () => {
    assert.equal(deliveredOrderFor([order({ id: "GV-5", items: [{ productId: OTHER_PRODUCT }] })], new Map(), UID, PRODUCT), null);
    assert.equal(deliveredOrderFor([order({ id: "GV-6", items: null })], new Map(), UID, PRODUCT), null);
  });

  test("the first matching order is used, and other orders are skipped", () => {
    const orders = [
      order({ id: "GV-7", status: "PLACED" }),
      order({ id: "GV-8", userId: OTHER }),
      order({ id: "GV-9" }),
    ];
    assert.equal(deliveredOrderFor(orders, new Map(), UID, PRODUCT), "GV-9");
  });
});

describe("one review per customer and the edit window", () => {
  test("a customer with a delivered order can review once", () => {
    assert.deepEqual(canCreateReview(null, "GV-1"), { ok: true });
  });

  test("no delivered order means no review, with the reason", () => {
    assert.deepEqual(canCreateReview(null, null), { ok: false, reason: "NOT_DELIVERED" });
  });

  test("a second review of the same product is refused, even with a delivered order", () => {
    assert.deepEqual(canCreateReview({ createdAtMs: NOW, editCount: 0 }, "GV-1"), { ok: false, reason: "ALREADY_REVIEWED" });
  });

  test("the review can be edited once, within 7 days of posting", () => {
    assert.deepEqual(canEditReview({ createdAtMs: NOW - DAY, editCount: 0 }, NOW), { ok: true });
  });

  test("the edit window includes exactly 7 days and closes after", () => {
    assert.deepEqual(canEditReview({ createdAtMs: NOW - EDIT_WINDOW_MS, editCount: 0 }, NOW), { ok: true });
    assert.deepEqual(canEditReview({ createdAtMs: NOW - EDIT_WINDOW_MS - 1, editCount: 0 }, NOW), { ok: false, reason: "EDIT_WINDOW_CLOSED" });
  });

  test("after one edit, no more edits even inside the window", () => {
    assert.deepEqual(canEditReview({ createdAtMs: NOW - DAY, editCount: 1 }, NOW), { ok: false, reason: "ALREADY_EDITED" });
  });

  test("a rejected review can still be corrected once, inside the window", () => {
    // The status is not part of the edit rule: an edit sends any review back to PENDING for a new check.
    assert.equal(canEditReview({ createdAtMs: NOW - 2 * DAY, editCount: 0 }, NOW).ok, true);
  });
});

describe("rating input", () => {
  test("ratings are whole numbers from 1 to 5", () => {
    assert.equal(parseRating(1), 1);
    assert.equal(parseRating(5), 5);
    assert.equal(parseRating("4"), 4);
    for (const bad of [0, 6, 4.5, -1, "4.5", "five", null, undefined, NaN, Infinity]) assert.equal(parseRating(bad), null, String(bad));
  });

  test("a valid review is trimmed and its title is collapsed to one line", () => {
    const r = validateReviewInput({ rating: 5, title: "  Gentle   on skin  ", body: "  Works well for my dry skin, no stinging at all.  " });
    assert.deepEqual(r, { ok: true, value: { rating: 5, title: "Gentle on skin", body: "Works well for my dry skin, no stinging at all." } });
  });

  test("the body must be 10 to 1000 characters", () => {
    assert.equal(validateReviewInput({ rating: 3, title: "", body: "too short" }).ok, false);
    assert.equal(validateReviewInput({ rating: 3, title: "", body: prose(10) }).ok, true);
    assert.equal(validateReviewInput({ rating: 3, title: "", body: prose(BODY_MAX + 1) }).ok, false);
    assert.equal(validateReviewInput({ rating: 3, title: "", body: prose(BODY_MAX) }).ok, true);
  });

  test("the title is at most 80 characters", () => {
    assert.equal(validateReviewInput({ rating: 3, title: prose(80), body: "a fine review text" }).ok, true);
    assert.equal(validateReviewInput({ rating: 3, title: prose(81), body: "a fine review text" }).ok, false);
  });

  test("links, email addresses and profanity are refused in titles and bodies", () => {
    assert.equal(validateReviewInput({ rating: 3, title: "", body: "Buy cheaper at www.deals-shop.in today" }).ok, false);
    assert.equal(validateReviewInput({ rating: 3, title: "Great", body: "Email me at priya@mail.com for more" }).ok, false);
    assert.equal(validateReviewInput({ rating: 1, title: "This is shit", body: "The product is terrible for skin" }).ok, false);
  });

  test("non-string title and body are treated as empty", () => {
    assert.equal(validateReviewInput({ rating: 3, title: 42, body: { x: 1 } }).ok, false);
  });
});

describe("first name shown with a review", () => {
  test("only the first word, with the first letter capitalised", () => {
    assert.equal(firstNameFor("priya sharma"), "Priya");
    assert.equal(firstNameFor("  ananya   Rao "), "Ananya");
    assert.equal(firstNameFor("Mary-Jane O'Neil"), "Mary-Jane");
  });

  test("phone numbers, email addresses and blank names give no name", () => {
    assert.equal(firstNameFor("9876543210"), "");
    assert.equal(firstNameFor("priya@mail.com"), "");
    assert.equal(firstNameFor("   "), "");
    assert.equal(firstNameFor(undefined), "");
    assert.equal(firstNameFor(42), "");
  });
});

describe("rating aggregate", () => {
  test("the average is rounded to one decimal place, halves up", () => {
    assert.equal(averageOf({ count: 3, sum: 13 }), 4.3); // 4.33
    assert.equal(averageOf({ count: 4, sum: 17 }), 4.3); // 4.25 rounds up
    assert.equal(averageOf({ count: 2, sum: 7 }), 3.5);
    assert.equal(averageOf({ count: 4, sum: 10 }), 2.5);
    assert.equal(averageOf({ count: 3, sum: 14 }), 4.7); // 4.67
    assert.equal(averageOf({ count: 3, sum: 1 }), 0.3); // 0.33
    assert.equal(averageOf({ count: 1, sum: 5 }), 5);
  });

  test("no approved reviews means no average", () => {
    assert.equal(averageOf(EMPTY_TOTALS), null);
    assert.deepEqual(summaryOf(EMPTY_TOTALS), { average: null, count: 0 });
  });

  test("only APPROVED reviews count", () => {
    assert.deepEqual(totalsDelta(null, { status: "PENDING", rating: 5 }), { count: 0, sum: 0 });
    assert.deepEqual(totalsDelta(null, { status: "REJECTED", rating: 1 }), { count: 0, sum: 0 });
    assert.deepEqual(totalsDelta({ status: "PENDING", rating: 4 }, { status: "REJECTED", rating: 4 }), { count: 0, sum: 0 });
  });

  test("approving a pending review adds it", () => {
    assert.deepEqual(totalsDelta({ status: "PENDING", rating: 4 }, { status: "APPROVED", rating: 4 }), { count: 1, sum: 4 });
    assert.deepEqual(totalsDelta(null, { status: "APPROVED", rating: 5 }), { count: 1, sum: 5 });
  });

  test("rejecting an approved review takes it out again", () => {
    assert.deepEqual(totalsDelta({ status: "APPROVED", rating: 3 }, { status: "REJECTED", rating: 3 }), { count: -1, sum: -3 });
  });

  test("approved to rejected and back again leaves the totals as they were", () => {
    let totals: RatingTotals = { count: 1, sum: 4 };
    totals = applyDelta(totals, totalsDelta({ status: "APPROVED", rating: 4 }, { status: "REJECTED", rating: 4 }));
    assert.deepEqual(totals, { count: 0, sum: 0 });
    totals = applyDelta(totals, totalsDelta({ status: "REJECTED", rating: 4 }, { status: "APPROVED", rating: 4 }));
    assert.deepEqual(totals, { count: 1, sum: 4 });
  });

  test("an approved review that is edited leaves the average until approved again", () => {
    let totals: RatingTotals = { count: 2, sum: 9 };
    // Approved 4 stars is edited to 2 stars: it goes back to PENDING, so it leaves the totals.
    totals = applyDelta(totals, totalsDelta({ status: "APPROVED", rating: 4 }, { status: "PENDING", rating: 2 }));
    assert.deepEqual(totals, { count: 1, sum: 5 });
    totals = applyDelta(totals, totalsDelta({ status: "PENDING", rating: 2 }, { status: "APPROVED", rating: 2 }));
    assert.deepEqual(totals, { count: 2, sum: 7 });
    assert.equal(summaryOf(totals).average, 3.5);
  });

  test("a full moderation run gives the right average and count", () => {
    // Reviews: A (5), B (3), C (4). Approve A, B, C; reject B; then approve B again after an edit to 2 stars.
    let totals = EMPTY_TOTALS;
    const step = (before: { status: string; rating: number } | null, after: { status: string; rating: number } | null) => {
      totals = applyDelta(totals, totalsDelta(before, after));
    };
    step(null, { status: "APPROVED", rating: 5 });
    step(null, { status: "APPROVED", rating: 3 });
    step(null, { status: "APPROVED", rating: 4 });
    assert.deepEqual(summaryOf(totals), { average: 4, count: 3 });
    step({ status: "APPROVED", rating: 3 }, { status: "REJECTED", rating: 3 });
    assert.deepEqual(summaryOf(totals), { average: 4.5, count: 2 });
    step({ status: "REJECTED", rating: 3 }, { status: "PENDING", rating: 2 });
    assert.deepEqual(summaryOf(totals), { average: 4.5, count: 2 });
    step({ status: "PENDING", rating: 2 }, { status: "APPROVED", rating: 2 });
    assert.deepEqual(summaryOf(totals), { average: 3.7, count: 3 }); // 11/3 = 3.67
  });

  test("the totals never go negative", () => {
    assert.deepEqual(applyDelta(EMPTY_TOTALS, { count: -1, sum: -5 }), { count: 0, sum: 0 });
  });
});

describe("cursor for paging", () => {
  test("a cursor round-trips", () => {
    const raw = encodeCursor({ value: 4, createdAtMs: NOW });
    assert.deepEqual(decodeCursor(raw), { value: 4, createdAtMs: NOW });
  });

  test("no cursor is null, and garbage is invalid", () => {
    assert.equal(decodeCursor(undefined), null);
    assert.equal(decodeCursor(""), null);
    assert.equal(decodeCursor("not-a-cursor!"), "invalid");
    assert.equal(decodeCursor(Buffer.from('["x",1]').toString("base64url")), "invalid");
    assert.equal(decodeCursor("a".repeat(300)), "invalid");
  });

  test("sort defaults to newest", () => {
    assert.equal(parseSort(undefined), "newest");
    assert.equal(parseSort("lowest"), "lowest");
    assert.equal(parseSort("highest"), "highest");
    assert.equal(parseSort("random"), "newest");
  });
});

describe("content filter", () => {
  test("links are refused, with or without http", () => {
    assert.equal(contentProblem("see https://example.com"), "LINK");
    assert.equal(contentProblem("visit www.shop.in now"), "LINK");
    assert.equal(contentProblem("cheap at glow-deals.com"), "LINK");
    assert.equal(contentProblem("bit.ly/abc"), "LINK");
  });

  test("email addresses and phone-like numbers are refused", () => {
    assert.equal(contentProblem("write to a@b.co"), "CONTACT");
    assert.equal(contentProblem("call 98765 43210 anytime"), "CONTACT");
  });

  test("profanity is refused, including simple disguises", () => {
    assert.equal(contentProblem("this is shit"), "PROFANITY");
    assert.equal(contentProblem("f*ck this product"), "PROFANITY");
    assert.equal(contentProblem("it is fuuuck bad"), "PROFANITY");
    assert.equal(contentProblem("bhenchod product"), "PROFANITY");
  });

  test("repeated text is refused", () => {
    assert.equal(contentProblem("aaaaaaa good"), "REPEATED");
    assert.equal(contentProblem("buy buy buy buy now"), "REPEATED");
  });

  test("ordinary reviews and questions pass", () => {
    assert.equal(contentProblem("Gentle on my dry skin, and it does not sting. Would buy again."), null);
    assert.equal(contentProblem("Is it safe for oily skin? e.g. during summer"), null);
    assert.equal(contentProblem("Classic class of product, classy packaging"), null);
  });
});

describe("public and owner projections", () => {
  const stored = {
    productId: PRODUCT,
    createdBy: UID,
    orderId: "GV-1",
    displayName: "Priya",
    rating: 4,
    title: "Nice",
    body: "Works well for my skin.",
    verifiedPurchase: true,
    status: "APPROVED",
    editCount: 0,
    createdAtMs: NOW,
    updatedAtMs: NOW,
    moderatedBy: "staff-1",
    moderatedAt: NOW,
    rejectionReason: null,
  };

  test("a public review has only the review's own text, first name and dates", () => {
    const r = publicReview("rev-1", stored);
    assert.ok(r);
    assert.deepEqual(Object.keys(r).sort(), ["body", "createdAt", "displayName", "id", "rating", "title", "updatedAt", "verifiedPurchase"]);
    assert.equal(r.displayName, "Priya");
    assert.equal(r.verifiedPurchase, true);
    assert.equal(r.createdAt, new Date(NOW).toISOString());
    for (const secret of [UID, "GV-1", "staff-1", "createdBy", "orderId", "moderatedBy", "editCount"]) {
      assert.equal(JSON.stringify(r).includes(secret), false, secret);
    }
  });

  test("pending and rejected reviews are never public", () => {
    assert.equal(publicReview("rev-1", { ...stored, status: "PENDING" }), null);
    assert.equal(publicReview("rev-1", { ...stored, status: "REJECTED" }), null);
  });

  test("the owner sees their status and the rejection reason, and nothing internal", () => {
    const own = ownReview("rev-1", { ...stored, status: "REJECTED", rejectionReason: "Off topic" }, NOW + DAY);
    assert.ok(own);
    assert.equal(own.status, "REJECTED");
    assert.equal(own.rejectionReason, "Off topic");
    assert.equal(own.editable, true);
    assert.equal(own.editDeadline, new Date(NOW + EDIT_WINDOW_MS).toISOString());
    const text = JSON.stringify(own);
    for (const secret of [UID, "GV-1", "staff-1", "createdBy", "orderId", "moderatedBy"]) assert.equal(text.includes(secret), false, secret);
  });

  test("the owner's edit flag turns off after the window or after one edit", () => {
    assert.equal(ownReview("rev-1", { ...stored, editCount: 1 }, NOW)?.editable, false);
    assert.equal(ownReview("rev-1", stored, NOW + EDIT_WINDOW_MS + 1)?.editable, false);
    assert.equal(ownReview("rev-1", { ...stored, status: "PENDING" }, NOW)?.rejectionReason, null);
  });
});
