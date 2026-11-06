import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { parseReadRequest } from "@/lib/shop/notifications/policy";
import { markInAppRead, unreadCount } from "@/lib/shop/notifyStore";

export const dynamic = "force-dynamic";

// Marks the customer's own notifications read: { ids: [...] } (up to 100) or { all: true }. Ids are looked up only in
// the caller's own collection, so another customer's notification can never be changed. Sixty a minute per customer.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "notify-read-post", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "notify-read", 60);
  if (userLimited) return userLimited;

  const request = parseReadRequest(await req.json().catch(() => null));
  if (!request) return json({ ok: false, error: "Choose notifications to mark read." }, 400);
  const marked = await markInAppRead(customer.uid, request, Date.now());
  return json({ ok: true, marked, unreadCount: await unreadCount(customer.uid) });
}
