import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { activeSections } from "@/lib/shop/homeContent";
import { verifyHomePreviewToken } from "@/lib/shop/previewToken";

export const dynamic = "force-dynamic";

// The homepage sections the admin has published, for customers. Public and read only. Only sections that are on and
// inside their time window are returned, so a scheduled banner appears at its start time with no one pressing anything.
// With a valid staff preview token (?preview=...), the DRAFT sections are returned instead, never cached, so staff see
// the page as it would look after publishing. A bad or expired token returns an error, not the published content.
// The response holds no staff names. Limit: 120 requests a minute per IP address.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "shop-home-content", 120);
  if (limited) return limited;
  const preview = req.nextUrl.searchParams.get("preview");
  const isPreview = preview !== null;
  if (isPreview && !verifyHomePreviewToken(preview, Date.now(), process.env.PREVIEW_SECRET)) {
    return json({ ok: false, error: "This preview link has expired. Open the designer again." }, 403);
  }
  try {
    const snap = await db().collection("siteContent").doc("home").get();
    const data = snap.exists ? (snap.data() as { published?: { sections?: unknown }; draft?: { sections?: unknown } } | undefined) : undefined;
    const source = isPreview ? data?.draft : data?.published;
    // The draft is shown as if it were live: every enabled section whose window is open now.
    const sections = activeSections(source?.sections, Date.now());
    const res = json({ ok: true, sections, preview: isPreview });
    res.headers.set(
      "Cache-Control",
      isPreview ? "private, no-store" : "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    );
    if (isPreview) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  } catch {
    // The page still works without banners: the client shows its normal content.
    return json({ ok: true, sections: [], preview: isPreview });
  }
}
