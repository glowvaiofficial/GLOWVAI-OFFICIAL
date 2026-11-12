import { NextRequest, NextResponse } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { gatherExport } from "@/lib/shop/privacy/service";
import { logActivity, takeAttempt } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

const EXPORTS_PER_DAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

// The customer's own records as one JSON file, built on the server and returned directly (never emailed). Two exports a
// day per account. The file holds the customer's profile, addresses, orders summary, reviews, wishlist, subscriptions,
// activity and support ticket list. It holds no internal notes and no staff data.
export async function GET(req: NextRequest) {
  const g = await gate(req, "privacy-export", 5);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const now = Date.now();
  const allowed = await takeAttempt(`export:${uid}`, EXPORTS_PER_DAY, DAY_MS, now);
  if (!allowed.allowed) {
    const hours = Math.ceil(allowed.retryAfterMs / (60 * 60 * 1000));
    return json({ ok: false, error: `You can download your data twice a day. Try again in about ${hours} hour${hours === 1 ? "" : "s"}.` }, 429);
  }
  const data = await gatherExport(uid, now);
  await logActivity(uid, "DATA_EXPORTED", "Account data downloaded", now);
  const name = `glowvai-my-data-${new Date(now).toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
