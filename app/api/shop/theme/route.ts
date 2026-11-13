import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { readTheme, themeCssVariables } from "@/lib/shop/theme";
import { verifyHomePreviewToken } from "@/lib/shop/previewToken";

export const dynamic = "force-dynamic";

// The published shop colours and fonts, for every customer. Read only. With a valid staff preview token the draft is
// returned instead, never cached. A bad token is refused. Limit: 120 requests a minute per IP address.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "shop-theme", 120);
  if (limited) return limited;
  const preview = req.nextUrl.searchParams.get("preview");
  const isPreview = preview !== null;
  if (isPreview && !verifyHomePreviewToken(preview, Date.now(), process.env.PREVIEW_SECRET)) {
    return json({ ok: false, error: "This preview link has expired. Open the designer again." }, 403);
  }
  try {
    const snap = await db().collection("siteContent").doc("theme").get();
    const data = snap.exists ? (snap.data() as Record<string, unknown> | undefined) : undefined;
    const theme = readTheme(isPreview ? data?.draft : data?.published);
    const res = json({ ok: true, theme, cssVariables: themeCssVariables(theme), preview: isPreview });
    res.headers.set(
      "Cache-Control",
      isPreview ? "private, no-store" : "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    );
    return res;
  } catch {
    const theme = readTheme(undefined);
    return json({ ok: true, theme, cssVariables: themeCssVariables(theme), preview: isPreview });
  }
}
