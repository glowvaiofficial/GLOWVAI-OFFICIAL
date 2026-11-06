import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { numberOr0 } from "@/lib/shop/growth/ledger";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";

export const dynamic = "force-dynamic";

// The signed-in customer's coin balance and recent history. The balance is the wallet's cached value, which is written in
// the same transaction as each ledger entry, so it matches the history shown. Actors (staff names) are not shown.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "coins-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "coins-get", 60);
  if (userLimited) return userLimited;

  const repo = firestoreRepo(db());
  const wallet = await repo.get(repo.ref(`wallets/${customer.uid}`));
  const entries = await repo.query(`wallets/${customer.uid}/ledger`, [], { limit: GROWTH_CONFIG.coins.historyLimit, orderByDesc: "createdAt" });
  return json({
    ok: true,
    coins: {
      balance: numberOr0(wallet.data()?.balance),
      rupeesPerCoin: GROWTH_CONFIG.coins.rupeesPerCoin,
      history: entries.map((e) => {
        const d = e.data() ?? {};
        return {
          id: e.id,
          type: d.type ?? null,
          source: d.source ?? null,
          amount: numberOr0(d.amount),
          signed: numberOr0(d.signed),
          balanceAfter: numberOr0(d.balanceAfter),
          reason: typeof d.reason === "string" ? d.reason : "",
          orderId: typeof d.orderId === "string" ? d.orderId : null,
          createdAt: numberOr0(d.createdAt),
        };
      }),
    },
  });
}
