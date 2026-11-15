import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { chooseLayoutSource, readBlockSettings, readFooterDetails, readHeroOverride, readHomeLayout, readLayoutDevice, readProductRows } from "@/lib/shop/homeLayout";
import { verifyHomePreviewToken } from "@/lib/shop/previewToken";
import { activePreset, orderWithPreset } from "@/lib/shop/presets";
import { loadPresets } from "@/lib/shop/presetLookup";

export const dynamic = "force-dynamic";

// The order of the homepage blocks, for customers (published) or staff (the draft, with a valid preview token). Read
// only. Limit: 120 requests a minute per IP address.
// ?device=desktop serves the desktop layout (siteContent/homeLayout field desktop), or the mobile one when no desktop
// layout is saved (fallback: true). No device, or device=mobile, serves the mobile layout exactly as before.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "shop-home-layout", 120);
  if (limited) return limited;
  const device = readLayoutDevice(req.nextUrl.searchParams.getAll("device"));
  if (!device) return json({ ok: false, error: "Unknown device. Use desktop or mobile." }, 400);
  const preview = req.nextUrl.searchParams.get("preview");
  const isPreview = preview !== null;
  if (isPreview && !verifyHomePreviewToken(preview, Date.now(), process.env.PREVIEW_SECRET)) {
    return json({ ok: false, error: "This preview link has expired. Open the designer again." }, 403);
  }
  try {
    const snap = await db().collection("siteContent").doc("homeLayout").get();
    const data = snap.exists ? (snap.data() as Record<string, unknown> | undefined) : undefined;
    const { source, footerSource, fallback } = chooseLayoutSource(data, device, isPreview);
    // A live seasonal preset can replace the block order. Footer stays last.
    const preset = activePreset(await loadPresets(db()), Date.now());
    const blocks = orderWithPreset(readHomeLayout(source), preset);
    const settings = readBlockSettings(source);
    const rows = readProductRows(source);
    const hero = readHeroOverride(source);
    const footer = readFooterDetails(footerSource);
    const res = json({ ok: true, blocks, settings, rows, hero, footer, preview: isPreview, device, fallback });
    res.headers.set("Cache-Control", isPreview ? "private, no-store" : "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch {
    return json({ ok: true, blocks: readHomeLayout(undefined), settings: {}, hero: null, footer: readFooterDetails(undefined), preview: isPreview, device, fallback: device === "desktop" });
  }
}
