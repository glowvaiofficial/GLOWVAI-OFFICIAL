import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { activeSections } from "@/lib/shop/homeContent";

export const dynamic = "force-dynamic";

// The homepage sections the admin has published, for customers. Public and read only. Only sections that are on and
// inside their time window are returned, so a scheduled banner appears at its start time with no one pressing anything.
// The response holds no staff names or draft content. Limit: 120 requests a minute per IP address.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "shop-home-content", 120);
  if (limited) return limited;
  try {
    const snap = await db().collection("siteContent").doc("home").get();
    const published = snap.exists ? (snap.data()?.published as { sections?: unknown } | undefined) : undefined;
    const sections = activeSections(published?.sections, Date.now());
    const res = json({ ok: true, sections });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch {
    // The page still works without banners: the client shows its normal content.
    return json({ ok: true, sections: [] });
  }
}
