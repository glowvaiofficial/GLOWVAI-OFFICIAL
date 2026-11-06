import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { SHOP_HOURS, isShopOpen, offeredSlots } from "@/lib/shop/slots";

export const dynamic = "force-dynamic";

// The delivery times offered right now, worked out on the server from the clock (IST). The order route checks the
// chosen slot again when the order is placed, so a time that has passed is refused there.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "slots-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "slots-get", 60);
  if (userLimited) return userLimited;
  const now = Date.now();
  return json({
    ok: true,
    timezone: SHOP_HOURS.timezone,
    shopOpen: isShopOpen(now),
    serverTime: now,
    slots: offeredSlots(now),
  });
}
