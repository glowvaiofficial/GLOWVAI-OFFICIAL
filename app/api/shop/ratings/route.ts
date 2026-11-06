import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { RATINGS } from "@/lib/shop/reviews";

export const dynamic = "force-dynamic";

// Public and read-only: the average rating and review count of each product that has approved reviews, from the
// productRatings totals the reviews feature keeps up to date. Carries no customer data. Products without reviews are
// not listed, so the shop shows no rating for them rather than a made-up one.
const MAX_PRODUCTS = 500;

export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "ratings-get", 60);
  if (ipLimited) return ipLimited;
  const snap = await db().collection(RATINGS).where("count", ">", 0).limit(MAX_PRODUCTS).get();
  const ratings: Record<string, { average: number; count: number }> = {};
  for (const doc of snap.docs) {
    const r = doc.data();
    const count = Math.floor(Number(r.count) || 0);
    const average = Number(r.average) || 0;
    if (count > 0 && average > 0 && /^[A-Za-z0-9_-]{1,140}$/.test(doc.id)) {
      ratings[doc.id] = { average: Math.round(average * 10) / 10, count };
    }
  }
  return json({ ok: true, ratings });
}
