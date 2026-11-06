import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { applyReferralCode } from "@/lib/shop/growth/referrals";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

// A new customer applies a friend's code once, before their first order. Limits: each customer may try 3 times a day,
// and each address 10 times a day, so codes cannot be guessed by trying many. Refusals say why, and nothing is written.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "referral-apply", GROWTH_CONFIG.referral.applyPerIpPerDay, DAY_MS);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "referral-apply", GROWTH_CONFIG.referral.applyPerUserPerDay, DAY_MS);
  if (userLimited) return userLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const result = await applyReferralCode(firestoreRepo(db()), { uid: customer.uid, code: body.code, now: Date.now() });
  if (!result.ok) return json({ ok: false, code: result.code, error: result.message }, 400);
  return json({ ok: true });
}
