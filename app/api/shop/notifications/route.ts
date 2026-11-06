import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { decodeCursor, pageLimit } from "@/lib/shop/notifications/policy";
import { listInApp, unreadCount } from "@/lib/shop/notifyStore";

export const dynamic = "force-dynamic";

// The signed-in customer's in-app notifications, newest first: 30 per page, with ?cursor= from the previous page.
// Also returns the unread count for the header badge. Sixty requests a minute per customer.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "notify-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "notify-read", 60);
  if (userLimited) return userLimited;

  const params = req.nextUrl.searchParams;
  const cursor = params.get("cursor");
  if (cursor !== null && !decodeCursor(cursor)) return json({ ok: false, error: "That page is no longer available. Reload the list." }, 400);
  const page = await listInApp(customer.uid, pageLimit(params.get("limit")), cursor);
  if (!page) return json({ ok: false, error: "That page is no longer available. Reload the list." }, 400);
  const unread = await unreadCount(customer.uid);
  return json({ ok: true, notifications: page.items, nextCursor: page.nextCursor, unreadCount: unread });
}
