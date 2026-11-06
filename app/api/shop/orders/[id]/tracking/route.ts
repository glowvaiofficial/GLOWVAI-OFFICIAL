import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { customerTracking } from "@/lib/rider/deliveries";
import { ORDER_ID_RE } from "@/lib/rider/assignments";

export const dynamic = "force-dynamic";

// Customer's own order: its status and the rider's approximate position (3 decimals, about 100 m), only while the
// order is out for delivery and the point is fresh.
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "order-tracking", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "order-tracking", 120);
  if (userLimited) return userLimited;
  const { id } = await context.params;
  if (!ORDER_ID_RE.test(id)) return json({ ok: false, error: "We could not find that order." }, 404);
  try {
    return json({ ok: true, tracking: await customerTracking(customer.uid, id) });
  } catch {
    return json({ ok: false, error: "We could not find that order." }, 404);
  }
}
