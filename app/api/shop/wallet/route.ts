import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { walletSummaryLive, walletHistoryLive } from "@/lib/shop/wallet/live";

export const dynamic = "force-dynamic";

// The signed-in customer's GlowVai Coins wallet: balance, the rate, the limits, and the first page of history.
// Read-only. Limit: 60 reads a minute per customer.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "wallet-get", 120);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-get", 60);
  if (userLimited) return userLimited;
  const [summary, history] = await Promise.all([walletSummaryLive(customer.uid), walletHistoryLive(customer.uid, null)]);
  if (!history.ok) return json({ ok: false, error: "Your wallet could not be loaded." }, 500);
  return json({ ok: true, wallet: summary, history: history.rows, nextCursor: history.nextCursor });
}
