import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { walletHistoryLive } from "@/lib/shop/wallet/live";

export const dynamic = "force-dynamic";

// One page of the customer's wallet history (20 rows, newest first). Pass the nextCursor from the last page as ?cursor=.
// Limit: 60 requests a minute per customer.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "wallet-history", 120);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-history", 60);
  if (userLimited) return userLimited;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const page = await walletHistoryLive(customer.uid, cursor && cursor.length > 0 ? cursor : null);
  if (!page.ok) return json({ ok: false, error: "That page could not be found. Reload your wallet." }, 400);
  return json({ ok: true, history: page.rows, nextCursor: page.nextCursor });
}
