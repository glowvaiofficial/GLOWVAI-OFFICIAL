import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { customerLiveTracking, notifyStageOnce, TrackingNotFound } from "@/lib/shop/liveTracking";
import { ORDER_ID_RE } from "@/lib/rider/assignments";

export const dynamic = "force-dynamic";

// The customer's own order: stage, copy, delay banner, estimate, and the map points (the rider's point is rounded to
// about 100 m and only while the order is out). Never the rider's exact coordinates, phone or any PII beyond a first name.
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "order-tracking-live", 120);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "order-tracking-live", 60);
  if (userLimited) return userLimited;
  const { id } = await context.params;
  if (!ORDER_ID_RE.test(id)) return json({ ok: false, error: "We could not find that order." }, 404);
  try {
    const tracking = await customerLiveTracking(customer.uid, id);
    await notifyStageOnce(customer.uid, id, tracking.stage);
    return json({ ok: true, tracking });
  } catch (err) {
    if (err instanceof TrackingNotFound) return json({ ok: false, error: "We could not find that order." }, 404);
    return json({ ok: false, error: "We could not load this order. Try again." }, 500);
  }
}
