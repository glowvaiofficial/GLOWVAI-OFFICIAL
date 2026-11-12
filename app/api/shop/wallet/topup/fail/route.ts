import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { markFailed } from "@/lib/shop/wallet/topups";
import { TOPUP_LIMITS } from "@/lib/shop/wallet-config";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";

export const dynamic = "force-dynamic";

// The browser reports that Razorpay Checkout failed for a top-up. The top-up is marked FAILED, which never credits. It is
// not final: if Razorpay later captures a payment for it, the webhook or verify still credits it. A PAID top-up is left
// alone. Limit: 30 per hour per customer.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "wallet-topup-fail", 60, 60 * 60 * 1000);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-topup-fail", TOPUP_LIMITS.failPerCustomerPerHour, 60 * 60 * 1000);
  if (userLimited) return userLimited;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const topupId = typeof body?.topupId === "string" ? body.topupId : "";
  if (!/^[a-f0-9]{24}$/.test(topupId)) return json({ ok: false, error: "We could not find this top-up." }, 404);
  const repo = firestoreRepo(db());
  const result = await markFailed({ repo, now: Date.now() }, { topupId, reason: "CHECKOUT_FAILED", paymentId: null, expectUid: customer.uid });
  if (!result.ok) return json({ ok: false, error: "We could not find this top-up." }, 404);
  return json({ ok: true, status: result.status });
}
