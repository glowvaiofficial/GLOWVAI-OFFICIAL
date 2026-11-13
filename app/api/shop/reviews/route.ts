import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByIpShared, limitByUser, limitByUserShared } from "@/lib/shop/server";
import { PRODUCT_ID_PATTERN, createReview, editReview, reviewEligibility, reviewFailure } from "@/lib/shop/reviews";
import { validateReviewInput } from "@/lib/shop/reviewRules";
import { recordActivity } from "@/lib/shop/activity";

export const dynamic = "force-dynamic";

// The signed-in customer's own review of one product. Writes (post and edit) are limited to 5 an hour per customer.
// The server decides who may write and says why not; the customer's name is read from their profile, never from here.

// GET ?productId=...  -> the customer's review (if any), whether they can write, and the reason when they cannot.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "reviews-own-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "reviews-own", 60);
  if (userLimited) return userLimited;
  const productId = req.nextUrl.searchParams.get("productId") ?? "";
  if (!PRODUCT_ID_PATTERN.test(productId)) return json({ ok: false, error: "That product could not be found." }, 404);
  const state = await reviewEligibility(customer.uid, productId, Date.now());
  return json({ ok: true, review: state.review, canWrite: state.canWrite, reason: state.reason });
}

async function writeGate(req: NextRequest): Promise<{ uid: string } | Response> {
  const ipLimited = await limitByIpShared(req, "reviews-write", 30, 60_000);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "reviews-own", 60);
  if (userLimited) return userLimited;
  const reviewLimited = await limitByUserShared(customer.uid, "review-write", 5, 60 * 60 * 1000, "You have sent several reviews recently. Try again in an hour.");
  if (reviewLimited) return reviewLimited;
  return { uid: customer.uid };
}

// POST: a new review, PENDING until staff approve it.
export async function POST(req: NextRequest) {
  const gate = await writeGate(req);
  if (gate instanceof Response) return gate;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!PRODUCT_ID_PATTERN.test(productId)) return json({ ok: false, error: "That product could not be found." }, 404);
  const checked = validateReviewInput({ rating: body.rating, title: body.title, body: body.body });
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);
  try {
    const created = await createReview(gate.uid, productId, checked.value, Date.now());
    await recordActivity(gate.uid, "review_submitted", Date.now());
    return json({ ok: true, status: created.status, message: "Thanks. Your review will show once our team has checked it." });
  } catch (err) {
    const refused = reviewFailure(err);
    if (refused) return refused;
    throw err;
  }
}

// PATCH: edits the customer's own review, once, within 7 days of posting. The edited review goes back to PENDING.
export async function PATCH(req: NextRequest) {
  const gate = await writeGate(req);
  if (gate instanceof Response) return gate;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!PRODUCT_ID_PATTERN.test(productId)) return json({ ok: false, error: "That product could not be found." }, 404);
  const checked = validateReviewInput({ rating: body.rating, title: body.title, body: body.body });
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);
  try {
    const updated = await editReview(gate.uid, productId, checked.value, Date.now());
    return json({ ok: true, status: updated.status, message: "Thanks. Your changes will show once our team has checked them." });
  } catch (err) {
    const refused = reviewFailure(err);
    if (refused) return refused;
    throw err;
  }
}
