import { NextRequest } from "next/server";
import { db, json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { razorpayConfigured } from "@/lib/shop/razorpay";
import { GIFT_MAX_RUPEES, GIFT_MIN_RUPEES } from "@/lib/shop/giftCards/rules";

export const dynamic = "force-dynamic";

// The gift cards this account bought or redeemed. Only the last four characters of a code are ever returned: the full
// code is shown once, at purchase, and is not stored.
export async function GET(req: NextRequest) {
  const g = await gate(req, "gift-cards-get", 60);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const cards = db().collection("giftCards");
  const [bought, redeemed] = await Promise.all([cards.where("purchasedBy", "==", uid).limit(50).get(), cards.where("redeemedBy", "==", uid).limit(50).get()]);
  const seen = new Map<string, Record<string, unknown>>();
  for (const d of bought.docs) seen.set(d.id, { role: "bought", ...d.data() });
  for (const d of redeemed.docs) if (!seen.has(d.id)) seen.set(d.id, { role: "redeemed", ...d.data() });
  const views = [...seen.values()].map((c) => ({
    cardId: String(c.cardId ?? ""),
    role: c.role,
    status: c.status === "REDEEMED" ? "REDEEMED" : "ACTIVE",
    amountRupees: Number(c.amountRupees) || 0,
    coins: Number(c.coins) || 0,
    recipientName: String(c.recipientName ?? ""),
    message: String(c.message ?? ""),
    lastFour: String(c.lastFour ?? ""),
    createdAt: Number(c.createdAt) || 0,
  }));
  views.sort((a, b) => b.createdAt - a.createdAt);
  return json({ ok: true, enabled: razorpayConfigured(), cards: views, amount: { min: GIFT_MIN_RUPEES, max: GIFT_MAX_RUPEES } });
}
