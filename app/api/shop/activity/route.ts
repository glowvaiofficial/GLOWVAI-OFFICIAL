import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { listActivity } from "@/lib/shop/activity";
import { activityPageLimit } from "@/lib/shop/settings/rules";

export const dynamic = "force-dynamic";

// The customer's own account activity, newest first, one page at a time (?limit=, ?cursor=from the last page).
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "activity-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "activity-get", 60);
  if (userLimited) return userLimited;

  const url = new URL(req.url);
  const limit = activityPageLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor");
  if (cursor !== null && (cursor.length > 200)) return json({ ok: false, error: "That page is no longer available. Reload the list." }, 400);
  const page = await listActivity(customer.uid, limit, cursor);
  if (!page) return json({ ok: false, error: "That page is no longer available. Reload the list." }, 400);
  return json({ ok: true, items: page.items, nextCursor: page.nextCursor });
}
