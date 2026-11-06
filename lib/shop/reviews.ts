// Product reviews on the server: who may review, writing a review, and the rating aggregate. The rules are in
// ./reviewRules (pure, tested); this file reads and writes Firestore with the Admin SDK.
//
// Collections (both deny-by-default in the rules, reached only through these functions and the routes):
//   reviews/{productId}__{uid}   one review per customer per product
//   productRatings/{productId}   { count, sum, average, updatedAtMs }: totals of the APPROVED reviews
//
// Admin team: moderation goes through setReviewStatus(reviewId, next, actor, reason). approveReview and rejectReview are
// thin wrappers on it. Every status change, in either direction, adjusts productRatings in the same transaction, so the
// average and count always equal the APPROVED reviews. The review id is `${productId}__${uid}`.
import { db, json } from "./server";
import type { NextResponse } from "next/server";
import {
  REVIEW_REASON_TEXT,
  REVIEW_PAGE_SIZE,
  REVIEW_STATUSES,
  canCreateReview,
  canEditReview,
  deliveredOrderFor,
  encodeCursor,
  decodeCursor,
  firstNameFor,
  applyDelta,
  averageOf,
  orderHasProduct,
  ownReview,
  parseRating,
  publicReview,
  summaryOf,
  totalsDelta,
  type OwnReview,
  type PublicReview,
  type RatingSummary,
  type ReviewCursor,
  type ReviewSort,
  type ReviewStatus,
  type RatingTotals,
  type OrderLike,
} from "./reviewRules";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";

export const REVIEWS = "reviews";
export const RATINGS = "productRatings";
export const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/;
export const NAME_REQUIRED_TEXT = "Add your first name in your profile before you write a review.";
const REJECTION_REASON_MAX = 300;

// A refusal with an HTTP status and a short code. Routes turn it into a JSON response.
export class ReviewError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

// Who is moderating: the admin team's staff user.
export interface ModerationActor {
  uid: string;
  name: string;
}

// Turns a ReviewError into the JSON response the shop expects. Anything else is a real failure and is not swallowed.
export function reviewFailure(err: unknown): NextResponse | null {
  if (err instanceof ReviewError) return json({ ok: false, error: err.message, code: err.code }, err.status);
  return null;
}

export function reviewIdFor(productId: string, uid: string): string {
  return `${productId}__${uid}`;
}

function reviewRef(store: Firestore, reviewId: string): DocumentReference {
  return store.collection(REVIEWS).doc(reviewId);
}

function ratingRef(store: Firestore, productId: string): DocumentReference {
  return store.collection(RATINGS).doc(productId);
}

function totalsOf(data: Record<string, unknown> | undefined): RatingTotals {
  const count = Number(data?.count ?? 0);
  const sum = Number(data?.sum ?? 0);
  return { count: Number.isFinite(count) ? count : 0, sum: Number.isFinite(sum) ? sum : 0 };
}

// The rating document as stored: totals, and the average computed from them.
function ratingDoc(productId: string, totals: RatingTotals, nowMs: number) {
  return { productId, count: totals.count, sum: totals.sum, average: averageOf(totals), updatedAtMs: nowMs };
}

// The verified-purchase check. Reads the customer's orders (capped), then the staff overlays of only those orders that
// contain the product.
async function deliveredOrderIdFor(uid: string, productId: string): Promise<string | null> {
  const store = db();
  const snap = await store.collection("orders").where("userId", "==", uid).limit(100).get();
  const candidates: OrderLike[] = snap.docs
    .filter((d) => orderHasProduct(d.data().items, productId))
    .map((d) => ({ id: d.id, userId: d.data().userId, status: d.data().status, items: d.data().items }));
  if (candidates.length === 0) return null;
  const overlaySnaps = await store.getAll(...candidates.map((o) => store.collection("admin_orders").doc(o.id)));
  const overlays = new Map(overlaySnaps.map((s) => [s.id, s.exists ? (s.data() as Record<string, unknown>) : undefined]));
  return deliveredOrderFor(candidates, overlays, uid, productId);
}

async function firstNameOf(uid: string): Promise<string> {
  const snap = await db().collection("users").doc(uid).get();
  return firstNameFor(snap.data()?.name);
}

// --- Public reads ------------------------------------------------------------------------------------------------------

export async function ratingSummaryFor(productId: string): Promise<RatingSummary> {
  const snap = await ratingRef(db(), productId).get();
  return summaryOf(totalsOf(snap.data()));
}

// Approved reviews only, newest first unless a sort is asked for. Twenty per page, with an opaque cursor.
export async function listApprovedReviews(
  productId: string,
  sort: ReviewSort,
  cursorRaw: unknown,
): Promise<{ reviews: PublicReview[]; nextCursor: string | null } | "invalid-cursor"> {
  const cursor = decodeCursor(cursorRaw);
  if (cursor === "invalid") return "invalid-cursor";
  let q = db().collection(REVIEWS).where("productId", "==", productId).where("status", "==", "APPROVED");
  if (sort === "newest") {
    q = q.orderBy("createdAtMs", "desc");
    if (cursor) q = q.startAfter(cursor.createdAtMs);
  } else {
    q = q.orderBy("rating", sort === "highest" ? "desc" : "asc").orderBy("createdAtMs", "desc");
    if (cursor) q = q.startAfter(cursor.value, cursor.createdAtMs);
  }
  const snap = await q.limit(REVIEW_PAGE_SIZE).get();
  const reviews = snap.docs.map((d) => publicReview(d.id, d.data())).filter((r): r is PublicReview => r !== null);
  let nextCursor: string | null = null;
  if (snap.docs.length === REVIEW_PAGE_SIZE) {
    const last = snap.docs[snap.docs.length - 1].data();
    const createdAtMs = Number(last.createdAtMs);
    const value = sort === "newest" ? createdAtMs : Number(last.rating);
    nextCursor = encodeCursor({ value, createdAtMs });
  }
  return { reviews, nextCursor };
}

// --- The customer's own review -----------------------------------------------------------------------------------------

// Whether the customer may write (or edit) a review of this product, and the reason when not. Used to enable or disable
// the form, and returns the customer's own review (owner view) when there is one.
export async function reviewEligibility(
  uid: string,
  productId: string,
  nowMs: number,
): Promise<{ review: OwnReview | null; canWrite: boolean; reason: string | null }> {
  const snap = await reviewRef(db(), reviewIdFor(productId, uid)).get();
  if (snap.exists) {
    const d = snap.data() as Record<string, unknown>;
    const edit = canEditReview({ createdAtMs: Number(d.createdAtMs), editCount: Number(d.editCount ?? 0) }, nowMs);
    return {
      review: ownReview(snap.id, d, nowMs),
      canWrite: edit.ok,
      reason: edit.ok ? null : REVIEW_REASON_TEXT[edit.reason],
    };
  }
  const orderId = await deliveredOrderIdFor(uid, productId);
  const decision = canCreateReview(null, orderId);
  if (!decision.ok) return { review: null, canWrite: false, reason: REVIEW_REASON_TEXT[decision.reason] };
  if (!(await firstNameOf(uid))) return { review: null, canWrite: false, reason: NAME_REQUIRED_TEXT };
  return { review: null, canWrite: true, reason: null };
}

interface ReviewFields {
  rating: number;
  title: string;
  body: string;
}

// Posts the customer's review as PENDING. Refused unless the customer has a delivered order with this product, has no
// review of it yet, and has a first name on the profile. The name is read here, never taken from the request.
export async function createReview(uid: string, productId: string, input: ReviewFields, nowMs: number): Promise<{ id: string; status: ReviewStatus }> {
  const orderId = await deliveredOrderIdFor(uid, productId);
  if (!orderId) throw new ReviewError(403, REVIEW_REASON_TEXT.NOT_DELIVERED, "NOT_DELIVERED");
  const displayName = await firstNameOf(uid);
  if (!displayName) throw new ReviewError(403, NAME_REQUIRED_TEXT, "NAME_REQUIRED");

  const store = db();
  const id = reviewIdFor(productId, uid);
  const ref = reviewRef(store, id);
  await store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? { createdAtMs: Number(snap.data()?.createdAtMs), editCount: 0 } : null;
    const decision = canCreateReview(existing, orderId);
    if (!decision.ok) throw new ReviewError(409, REVIEW_REASON_TEXT[decision.reason], decision.reason);
    tx.set(ref, {
      productId,
      createdBy: uid,
      orderId,
      displayName,
      rating: input.rating,
      title: input.title,
      body: input.body,
      verifiedPurchase: true,
      status: "PENDING",
      editCount: 0,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      moderatedBy: null,
      moderatedAt: null,
      rejectionReason: null,
    });
  });
  return { id, status: "PENDING" };
}

// Edits the customer's own review, once, within 7 days of posting. An edit sends the review back to PENDING, so an
// approved review that is edited leaves the public average until staff approve it again.
export async function editReview(uid: string, productId: string, input: ReviewFields, nowMs: number): Promise<{ id: string; status: ReviewStatus }> {
  const store = db();
  const id = reviewIdFor(productId, uid);
  const ref = reviewRef(store, id);
  const rRef = ratingRef(store, productId);
  await store.runTransaction(async (tx) => {
    const [snap, rSnap] = await Promise.all([tx.get(ref), tx.get(rRef)]);
    if (!snap.exists) throw new ReviewError(404, "You have not reviewed this product yet.", "NOT_FOUND");
    const d = snap.data() as Record<string, unknown>;
    const edit = canEditReview({ createdAtMs: Number(d.createdAtMs), editCount: Number(d.editCount ?? 0) }, nowMs);
    if (!edit.ok) throw new ReviewError(409, REVIEW_REASON_TEXT[edit.reason], edit.reason);

    const before = { status: String(d.status), rating: parseRating(d.rating) ?? 0 };
    const delta = totalsDelta(before, { status: "PENDING", rating: input.rating });
    tx.update(ref, {
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: "PENDING",
      editCount: Number(d.editCount ?? 0) + 1,
      updatedAtMs: nowMs,
      moderatedBy: null,
      moderatedAt: null,
      rejectionReason: null,
    });
    if (delta.count !== 0 || delta.sum !== 0) {
      tx.set(rRef, ratingDoc(productId, applyDelta(totalsOf(rSnap.data()), delta), nowMs), { merge: true });
    }
  });
  return { id, status: "PENDING" };
}

// --- Moderation (admin team) -------------------------------------------------------------------------------------------

// Sets a review's status and keeps productRatings in step, in one transaction. Any change is allowed (approve, reject,
// approved -> rejected, rejected -> approved, back to pending). A rejection needs a reason, which the customer sees on
// their own review but the public never does. Returns the previous status and the summary after the change.
export async function setReviewStatus(
  reviewId: string,
  next: ReviewStatus,
  actor: ModerationActor,
  reason?: string,
): Promise<{ changed: boolean; previous: ReviewStatus; status: ReviewStatus; summary: RatingSummary }> {
  if (!(REVIEW_STATUSES as readonly string[]).includes(next)) throw new ReviewError(400, "Unknown review status.", "BAD_STATUS");
  const rejectionReason = (reason ?? "").trim().slice(0, REJECTION_REASON_MAX);
  if (next === "REJECTED" && rejectionReason.length < 3) {
    throw new ReviewError(400, "Give a reason for rejecting the review.", "REASON_REQUIRED");
  }
  const store = db();
  const ref = store.collection(REVIEWS).doc(reviewId);
  return store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ReviewError(404, "That review could not be found.", "NOT_FOUND");
    const d = snap.data() as Record<string, unknown>;
    const productId = String(d.productId ?? "");
    const previous = String(d.status) as ReviewStatus;
    const rating = parseRating(d.rating) ?? 0;
    const rRef = ratingRef(store, productId);
    const rSnap = await tx.get(rRef);
    const totals = totalsOf(rSnap.data());

    if (previous === next) return { changed: false, previous, status: next, summary: summaryOf(totals) };

    const delta = totalsDelta({ status: previous, rating }, { status: next, rating });
    const now = Date.now();
    tx.update(ref, {
      status: next,
      moderatedBy: actor.uid,
      moderatedAt: now,
      rejectionReason: next === "REJECTED" ? rejectionReason : null,
      updatedAtMs: now,
    });
    const updated = applyDelta(totals, delta);
    if (delta.count !== 0 || delta.sum !== 0) tx.set(rRef, ratingDoc(productId, updated, now), { merge: true });
    return { changed: true, previous, status: next, summary: summaryOf(updated) };
  });
}

export function approveReview(reviewId: string, actor: ModerationActor) {
  return setReviewStatus(reviewId, "APPROVED", actor);
}

export function rejectReview(reviewId: string, actor: ModerationActor, reason: string) {
  return setReviewStatus(reviewId, "REJECTED", actor, reason);
}
