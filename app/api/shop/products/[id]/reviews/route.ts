import { NextRequest } from "next/server";
import { json, limitByIp } from "@/lib/shop/server";
import { PRODUCT_ID_PATTERN, listApprovedReviews, ratingSummaryFor } from "@/lib/shop/reviews";
import { parseSort } from "@/lib/shop/reviewRules";

export const dynamic = "force-dynamic";

// Public reviews of a product: APPROVED only, 20 per page, newest unless sorted. The average and count come from the
// productRatings document the server keeps up to date, so the page never reads every review to show them.
// No uid, order, moderation or contact details leave here: each review has the first name only.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "product-reviews", 60);
  if (ipLimited) return ipLimited;
  const { id } = await params;
  if (!PRODUCT_ID_PATTERN.test(id)) return json({ ok: false, error: "That product could not be found." }, 404);

  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const [rating, page] = await Promise.all([ratingSummaryFor(id), listApprovedReviews(id, sort, req.nextUrl.searchParams.get("cursor"))]);
  if (page === "invalid-cursor") return json({ ok: false, error: "Those reviews could not be opened. Start again from the first page." }, 400);
  return json({ ok: true, productId: id, sort, rating, reviews: page.reviews, nextCursor: page.nextCursor });
}
