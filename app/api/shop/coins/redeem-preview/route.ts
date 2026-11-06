import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { previewCoins } from "@/lib/shop/orderCore";
import { parseBagLines } from "@/lib/shop/orderRequest";
import { coinsToRupees } from "@/lib/shop/growth/coins";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";

export const dynamic = "force-dynamic";

// The most coins the customer may use on this bag, and what that is worth. The item total is priced on the server from the
// catalogue, so the client cannot raise the cap. Nothing is written. Limit: 20 previews an hour per customer.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "coins-preview", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "coins-redeem", GROWTH_CONFIG.coins.redeemPreviewPerUserPerHour, 60 * 60 * 1000);
  if (userLimited) return userLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const bag = parseBagLines(body.items);
  if (!bag.ok) return json({ ok: false, error: bag.error }, bag.status);
  const priced = await previewCoins(db(), customer.uid, bag.value);
  if (!priced.ok) return json({ ok: false, error: priced.error }, priced.status);
  return json({
    ok: true,
    preview: {
      itemTotal: priced.itemTotal,
      balance: priced.balance,
      maxCoins: priced.maxRedeemable,
      maxDiscount: coinsToRupees(priced.maxRedeemable),
      capPercent: GROWTH_CONFIG.coins.maxRedeemPercentOfItemTotal,
    },
  });
}
