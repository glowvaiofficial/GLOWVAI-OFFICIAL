import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { verifyTopupLive } from "@/lib/shop/wallet/live";
import { TOPUP_LIMITS } from "@/lib/shop/wallet-config";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

// Called by the wallet after Razorpay Checkout reports success. The signature must match, then the payment is read from
// Razorpay and must be for this top-up's order and amount. Coins are credited once, in one transaction. A repeat call
// returns the same result and credits nothing more. Limits: 30 per hour per customer, 60 per hour per IP.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "wallet-topup-verify", TOPUP_LIMITS.verifyPerIpPerHour, HOUR);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-topup-verify", TOPUP_LIMITS.verifyPerCustomerPerHour, HOUR);
  if (userLimited) return userLimited;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!/^[A-Za-z0-9_]{4,80}$/.test(orderId) || !/^[A-Za-z0-9_]{4,80}$/.test(paymentId) || signature.length > 200) {
    return json({ ok: false, code: "BAD_SIGNATURE", error: "We could not confirm this payment." }, 400);
  }
  const result = await verifyTopupLive(customer.uid, { orderId, paymentId, signature });
  if (!result.ok) return json({ ok: false, code: result.code, error: result.error }, result.status);
  if (result.status === "PAID") {
    return json({ ok: true, status: "PAID", topupId: result.topupId, coins: result.coins, balance: result.balance });
  }
  return json({ ok: true, status: result.status, topupId: result.topupId, message: result.status === "PENDING" ? "Payment received. We are confirming it, and your coins will appear shortly." : "The payment failed, so no coins were added. You can try again." });
}
