// Product reviews: the rules, as pure functions. The routes (app/api/shop/reviews, app/api/shop/products/[id]/reviews)
// and the status-change function in lib/shop/reviews.ts call these inside Firestore transactions, and the tests run them
// directly. No server imports here.
import { contentProblem, CONTENT_PROBLEM_MESSAGE } from "./contentFilter";

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const TITLE_MAX = 80;
export const BODY_MIN = 10;
export const BODY_MAX = 1000;
export const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const REVIEW_PAGE_SIZE = 20;
// Editing is allowed once: the first edit after posting. The edit itself sends the review back to PENDING.
export const MAX_EDITS = 1;

export type ReviewSort = "newest" | "highest" | "lowest";
export function parseSort(value: unknown): ReviewSort {
  return value === "highest" || value === "lowest" ? value : "newest";
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

// --- Input -------------------------------------------------------------------------------------------------------------

// Rating: a whole number from 1 to 5, as a number or as a single digit string.
export function parseRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^[1-5]$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function validateReviewInput(input: { rating: unknown; title: unknown; body: unknown }): Checked<{ rating: number; title: string; body: string }> {
  const rating = parseRating(input.rating);
  if (rating === null) return { ok: false, error: "Choose a rating from 1 to 5 stars." };
  const title = typeof input.title === "string" ? input.title.trim().replace(/\s+/g, " ") : "";
  if (title.length > TITLE_MAX) return { ok: false, error: `Keep the title to ${TITLE_MAX} characters or fewer.` };
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (body.length < BODY_MIN) return { ok: false, error: `Write at least ${BODY_MIN} characters about the product.` };
  if (body.length > BODY_MAX) return { ok: false, error: `Keep the review to ${BODY_MAX} characters or fewer.` };
  for (const field of [title, body]) {
    const problem = contentProblem(field);
    if (problem) return { ok: false, error: CONTENT_PROBLEM_MESSAGE[problem] };
  }
  return { ok: true, value: { rating, title, body } };
}

// The first name shown with a review. Only a plain word of letters is kept: anything with digits, "@" or punctuation
// (a phone number, an email address) gives "". The caller then asks the customer to add a name to the profile.
export function firstNameFor(fullName: unknown): string {
  if (typeof fullName !== "string") return "";
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (!/^\p{L}[\p{L}'-]{0,29}$/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// --- Purchase rule -------------------------------------------------------------------------------------------------------

export interface OrderLike {
  id: string;
  userId: unknown;
  status: unknown;
  items: unknown;
}

// The customer-facing status of an order, as /api/shop/orders shows it: a staff overlay (admin_orders) wins over the
// shop status, and a cancelled overlay means the order was never delivered.
export function effectiveOrderStatus(status: unknown, overlay: Record<string, unknown> | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "");
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return typeof status === "string" ? status : "";
}

export function orderHasProduct(items: unknown, productId: string): boolean {
  return Array.isArray(items) && items.some((it) => it && typeof it === "object" && (it as { productId?: unknown }).productId === productId);
}

// The id of a DELIVERED order that belongs to this customer and contains this product, or null. Verified purchase is
// exactly this: the owner, the delivered status (after any staff overlay), and the product in the order's items.
export function deliveredOrderFor(
  orders: OrderLike[],
  overlays: Map<string, Record<string, unknown> | undefined>,
  uid: string,
  productId: string,
): string | null {
  for (const order of orders) {
    if (order.userId !== uid) continue;
    if (!orderHasProduct(order.items, productId)) continue;
    if (effectiveOrderStatus(order.status, overlays.get(order.id)) === "DELIVERED") return order.id;
  }
  return null;
}

// --- One review per customer, and the edit window ----------------------------------------------------------------------

export interface ExistingReview {
  createdAtMs: number;
  editCount: number;
}

// Whether a customer may create a review, given the review they may already have for this product.
export function canCreateReview(existing: ExistingReview | null, deliveredOrderId: string | null): { ok: true } | { ok: false; reason: "NOT_DELIVERED" | "ALREADY_REVIEWED" } {
  if (existing) return { ok: false, reason: "ALREADY_REVIEWED" };
  if (!deliveredOrderId) return { ok: false, reason: "NOT_DELIVERED" };
  return { ok: true };
}

// Editing: once, and only within EDIT_WINDOW_MS of the review being posted.
export function canEditReview(existing: ExistingReview, nowMs: number): { ok: true } | { ok: false; reason: "EDIT_WINDOW_CLOSED" | "ALREADY_EDITED" } {
  if (existing.editCount >= MAX_EDITS) return { ok: false, reason: "ALREADY_EDITED" };
  if (nowMs - existing.createdAtMs > EDIT_WINDOW_MS) return { ok: false, reason: "EDIT_WINDOW_CLOSED" };
  return { ok: true };
}

export const REVIEW_REASON_TEXT: Record<string, string> = {
  NOT_DELIVERED: "You can review this product after your order containing it is delivered.",
  ALREADY_REVIEWED: "You have already reviewed this product. You can edit your review once, within 7 days of posting it.",
  EDIT_WINDOW_CLOSED: "The 7-day window to edit this review has closed.",
  ALREADY_EDITED: "You have already edited this review once.",
};

// --- Rating aggregate --------------------------------------------------------------------------------------------------
// The product's rating is kept as totals (count and sum of stars) of the APPROVED reviews. Only the totals change when a
// review is approved, rejected or edited, so the average never has to read the reviews.

export interface RatingTotals {
  count: number;
  sum: number;
}

export const EMPTY_TOTALS: RatingTotals = { count: 0, sum: 0 };

// What one review adds to the totals: nothing unless it is APPROVED.
export function contributionOf(status: ReviewStatus | string | null | undefined, rating: number | null | undefined): RatingTotals {
  if (status !== "APPROVED" || typeof rating !== "number") return { count: 0, sum: 0 };
  return { count: 1, sum: rating };
}

// Change in the totals when a review goes from `before` to `after` (either may be null for "no review").
export function totalsDelta(
  before: { status: string; rating: number } | null,
  after: { status: string; rating: number } | null,
): RatingTotals {
  const a = contributionOf(after?.status, after?.rating);
  const b = contributionOf(before?.status, before?.rating);
  return { count: a.count - b.count, sum: a.sum - b.sum };
}

export function applyDelta(totals: RatingTotals, delta: RatingTotals): RatingTotals {
  return { count: Math.max(0, totals.count + delta.count), sum: Math.max(0, totals.sum + delta.sum) };
}

// Average to one decimal place, rounding halves up, computed in whole numbers so no float error creeps in.
// 13/3 -> 4.3, 17/4 -> 4.3 (4.25 rounds up), 7/2 -> 3.5. Null when there are no approved reviews.
export function averageOf(totals: RatingTotals): number | null {
  if (totals.count <= 0) return null;
  const tenths = Math.floor((totals.sum * 20 + totals.count) / (2 * totals.count));
  return tenths / 10;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export function summaryOf(totals: RatingTotals): RatingSummary {
  const count = Math.max(0, totals.count);
  return { average: averageOf({ count, sum: totals.sum }), count };
}

// --- Cursor and public projections -------------------------------------------------------------------------------------

export interface ReviewCursor {
  // The sort value of the last review on the page (rating for highest and lowest, creation time for newest) and its
  // creation time, which breaks ties.
  value: number;
  createdAtMs: number;
}

export function encodeCursor(c: ReviewCursor): string {
  return Buffer.from(JSON.stringify([c.value, c.createdAtMs]), "utf8").toString("base64url");
}

export function decodeCursor(raw: unknown): ReviewCursor | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 200) return "invalid";
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) return "invalid";
    const [value, createdAtMs] = parsed;
    if (typeof value !== "number" || typeof createdAtMs !== "number" || !Number.isFinite(value) || !Number.isFinite(createdAtMs)) return "invalid";
    return { value, createdAtMs };
  } catch {
    return "invalid";
  }
}

type Doc = Record<string, unknown>;

// The public view of an APPROVED review. Only these fields leave the server: no uid, order id, moderation details.
export interface PublicReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  verifiedPurchase: true;
  createdAt: string;
  updatedAt: string;
}

export function publicReview(id: string, d: Doc): PublicReview | null {
  if (d.status !== "APPROVED") return null;
  const rating = parseRating(d.rating);
  if (rating === null) return null;
  return {
    id,
    rating,
    title: typeof d.title === "string" ? d.title : "",
    body: typeof d.body === "string" ? d.body : "",
    displayName: typeof d.displayName === "string" ? d.displayName : "",
    verifiedPurchase: true,
    createdAt: isoOf(d.createdAtMs),
    updatedAt: isoOf(d.updatedAtMs),
  };
}

// The customer's own review: the status and, if it was rejected, the reason. Still no internal fields.
export interface OwnReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  status: ReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  editDeadline: string;
}

export function ownReview(id: string, d: Doc, nowMs: number): OwnReview | null {
  const rating = parseRating(d.rating);
  if (rating === null || !(REVIEW_STATUSES as readonly string[]).includes(String(d.status))) return null;
  const createdAtMs = Number(d.createdAtMs);
  const editable = canEditReview({ createdAtMs, editCount: Number(d.editCount ?? 0) }, nowMs).ok;
  return {
    id,
    rating,
    title: typeof d.title === "string" ? d.title : "",
    body: typeof d.body === "string" ? d.body : "",
    displayName: typeof d.displayName === "string" ? d.displayName : "",
    status: d.status as ReviewStatus,
    rejectionReason: d.status === "REJECTED" && typeof d.rejectionReason === "string" ? d.rejectionReason : null,
    createdAt: isoOf(d.createdAtMs),
    updatedAt: isoOf(d.updatedAtMs),
    editable,
    editDeadline: isoOf(createdAtMs + EDIT_WINDOW_MS),
  };
}

function isoOf(ms: unknown): string {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : "";
}
