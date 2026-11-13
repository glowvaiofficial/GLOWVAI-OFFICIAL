import { NextRequest } from "next/server";
import { clientIp, customerFrom, db, json, limitByIp, limitByUserShared } from "@/lib/shop/server";
import { takeAttempt, logActivity } from "@/lib/shop/privacy/store";
import { REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS, normalizeGiftCode } from "@/lib/shop/giftCards/rules";
import { creditGiftCard } from "@/lib/shop/giftCards/service";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";

export const dynamic = "force-dynamic";

// Redeems a gift card code into Glow coins. Brute-force protection: every attempt counts, right or wrong, and the limit
// is five attempts per fifteen minutes per customer and per IP address. The IP address is only used as a hashed counter key.
const INVALID = "That code is not valid. Check it and try again.";

export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "gift-card-redeem", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = await limitByUserShared(customer.uid, "gift-card-redeem", 5, 15 * 60 * 1000, "Too many attempts. Try again in a few minutes.");
  if (userLimited) return userLimited;

  const now = Date.now();
  const byCustomer = await takeAttempt(`gc-redeem:uid:${customer.uid}`, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS, now);
  const byIp = await takeAttempt(`gc-redeem:ip:${clientIp(req)}`, REDEEM_MAX_ATTEMPTS, REDEEM_WINDOW_MS, now);
  if (!byCustomer.allowed || !byIp.allowed) {
    const wait = Math.ceil(Math.max(byCustomer.retryAfterMs, byIp.retryAfterMs) / 60_000);
    return json({ ok: false, error: `Too many attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` }, 429);
  }

  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizeGiftCode(body?.code);
  if (!code) return json({ ok: false, error: INVALID }, 400);

  const outcome = await creditGiftCard(firestoreRepo(db()), customer.uid, code, now);
  if (!outcome.ok) {
    if (outcome.code === "ALREADY_REDEEMED") return json({ ok: false, error: "This gift card has already been used." }, 409);
    if (outcome.code === "LEDGER_REFUSED") return json({ ok: false, error: "Your coins could not be updated. Try again in a moment." }, 500);
    return json({ ok: false, error: INVALID }, 400);
  }
  if (!outcome.alreadyRedeemed) await logActivity(customer.uid, "GIFT_CARD_REDEEMED", "A gift card was redeemed", now);
  return json({ ok: true, coins: outcome.coins, alreadyRedeemed: outcome.alreadyRedeemed });
}
