import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { createTopupLive, topupStatusLive } from "@/lib/shop/wallet/live";
import { TOPUP_LIMITS } from "@/lib/shop/wallet-config";
import { TOPUP_MESSAGES } from "@/lib/shop/wallet/rules";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

// Starts a top-up. The customer sends only the amount in whole rupees; the server checks the bounds, the daily cap and the
// balance cap, records the top-up as CREATED (customer id kept server-side), and opens a Razorpay order whose notes hold
// the top-up id only. Returns the order id and the public key id for Razorpay Checkout. Never the secret.
// Limits: 5 per hour per customer, 20 per hour per IP.
export async function POST(req: NextRequest) {
  // Off until the owner confirms the legal review and a live Razorpay account (set WALLET_TOPUP_ENABLED=true).
  if (process.env.WALLET_TOPUP_ENABLED !== "true") {
    return json({ ok: false, code: "NOT_AVAILABLE", error: "GlowVai Coins top-up is not available yet." }, 503);
  }
  const ipLimited = limitByIp(req, "wallet-topup-create", TOPUP_LIMITS.createPerIpPerHour, HOUR);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-topup-create", TOPUP_LIMITS.createPerCustomerPerHour, HOUR);
  if (userLimited) return userLimited;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const result = await createTopupLive(customer.uid, body.amountRupees);
  if (!result.ok) return json({ ok: false, code: result.code, error: result.error }, result.status);
  return json({
    ok: true,
    topupId: result.topupId,
    rupees: result.rupees,
    coins: result.coins,
    payment: result.payment,
  });
}

// The state of one top-up (for the customer's own top-ups only). A top-up still open after the expiry window is EXPIRED.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "wallet-topup-status", 120);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wallet-topup-status", TOPUP_LIMITS.statusPerMinute);
  if (userLimited) return userLimited;
  const topupId = req.nextUrl.searchParams.get("topupId") ?? "";
  if (!/^[a-f0-9]{24}$/.test(topupId)) return json({ ok: false, error: "We could not find this top-up." }, 404);
  const result = await topupStatusLive(customer.uid, topupId);
  if (!result.ok) return json({ ok: false, error: TOPUP_MESSAGES.NOT_FOUND }, 404);
  const hold = result.hold === "AMOUNT_MISMATCH" || result.hold === "BALANCE_CAP" ? "HELD" : null;
  return json({
    ok: true,
    topup: {
      topupId: result.topupId,
      status: result.status,
      held: hold !== null,
      rupees: result.amountRupees,
      coins: result.coins,
      message: hold ? "Your payment was received but the coins could not be added yet. Our team will review it." : TOPUP_MESSAGES[result.status],
    },
  });
}
