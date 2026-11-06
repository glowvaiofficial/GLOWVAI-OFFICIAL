import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { getOrCreateReferralCode, referralStatus } from "@/lib/shop/growth/referrals";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";

export const dynamic = "force-dynamic";

// The signed-in customer's referral code, share link and status. The code is created on first view.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "referral-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "referral-get", 60);
  if (userLimited) return userLimited;

  const repo = firestoreRepo(db());
  const code = await getOrCreateReferralCode(repo, customer.uid, Date.now());
  if (!code) return json({ ok: false, error: "Your referral code could not be created. Please try again." }, 503);
  const status = await referralStatus(repo, customer.uid);
  return json({
    ok: true,
    referral: {
      ...status,
      code,
      shareUrl: `https://glowvai.in/shop?ref=${code}`,
      referrerCoins: GROWTH_CONFIG.referral.referrerCoins,
      refereeCoins: GROWTH_CONFIG.referral.refereeCoins,
      rewardTrigger: GROWTH_CONFIG.referral.rewardTrigger,
    },
  });
}
