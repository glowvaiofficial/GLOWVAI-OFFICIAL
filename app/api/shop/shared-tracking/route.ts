import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { db, json, limitByIp, tooMany } from "@/lib/shop/server";
import { ORDER_ID_RE } from "@/lib/rider/assignments";
import { checkShareToken, publicTrackingView, SHARE_GENERIC_ERROR, shareRecordOf } from "@/lib/shop/trackingShare";

export const dynamic = "force-dynamic";

// Public tracking view for a shared link: GET ?orderId=...&k=...
// Public, so it is limited per visitor (30 a minute) and per token (60 a minute; the token is keyed by its hash, never
// stored raw). Unknown, expired, revoked and malformed links all get the same generic 404, so nothing reveals whether an
// order exists. The answer is the allow-list projection from lib/shop/trackingShare.ts: no name, phone, address, items,
// delivery code or internal ids.
const generic = () => json({ ok: false, error: SHARE_GENERIC_ERROR }, 404);

export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "shared-tracking", 30);
  if (ipLimited) return ipLimited;
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  const token = req.nextUrl.searchParams.get("k") ?? "";
  // Limit per token before any database read. The key is a hash, so the raw token is not kept in memory either.
  const tokenKey = createHash("sha256").update(token, "utf8").digest("hex");
  if (tooMany(`shared-tracking-token:${tokenKey}`, 60, 60_000)) {
    return json({ ok: false, error: "Too many requests. Please wait a minute and try again." }, 429);
  }
  if (!ORDER_ID_RE.test(orderId) || !token) return generic();

  try {
    const ref = db().collection("orders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return generic();
    const order = snap.data() as Record<string, unknown>;
    const record = shareRecordOf(order.trackingShare);
    const checked = checkShareToken(token, record, Date.now());
    if (!checked.ok) return generic();
    const overlaySnap = await db().collection("admin_orders").doc(orderId).get();
    const overlay = overlaySnap.exists ? (overlaySnap.data() as Record<string, unknown>) : undefined;
    return json({ ok: true, tracking: publicTrackingView(order, overlay, orderId, Date.now()) });
  } catch {
    return generic();
  }
}
