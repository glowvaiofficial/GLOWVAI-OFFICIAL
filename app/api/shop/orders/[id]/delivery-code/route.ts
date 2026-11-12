import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { customerDeliveryCode } from "@/lib/shop/liveTracking";
import { TrackingNotFound } from "@/lib/shop/liveTracking";
import { ORDER_ID_RE } from "@/lib/rider/assignments";

export const dynamic = "force-dynamic";

// The customer's own delivery code. Returned only at stage 8 (the rider is at the drop point); otherwise
// {available: false} and no code. Never cached, never logged.
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "order-delivery-code", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "order-delivery-code", 60);
  if (userLimited) return userLimited;
  const { id } = await context.params;
  if (!ORDER_ID_RE.test(id)) return json({ ok: false, error: "We could not find that order." }, 404);
  try {
    return json({ ok: true, deliveryCode: await customerDeliveryCode(customer.uid, id) });
  } catch (err) {
    if (err instanceof TrackingNotFound) return json({ ok: false, error: "We could not find that order." }, 404);
    return json({ ok: false, error: "We could not load the delivery code. Try again." }, 500);
  }
}
