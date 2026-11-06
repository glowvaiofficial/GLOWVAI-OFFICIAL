import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { normaliseReferralCode } from "@/lib/shop/growth/codes";
import { AFFILIATE_CONFIG } from "@/lib/shop/affiliate/config";
import { attributionExpiresAt, isVisitorId, nextAttribution, readAttribution, signAttribution } from "@/lib/shop/affiliate/attribution";
import { recordAffiliateClick } from "@/lib/shop/affiliate/store";

export const dynamic = "force-dynamic";

const YEAR_S = 365 * 86_400;

// Records one click on an affiliate link (60 a minute per address). Sets the signed attribution cookie (last click wins
// inside the 30-day window) and a random visitor cookie. The click counts once per visitor per link per day. Nothing about
// the visitor is stored except a hash of the visitor id. The reply is the same whether or not the code exists.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "affiliate-click", AFFILIATE_CONFIG.rate.clickPerIpPerMinute);
  if (ipLimited) return ipLimited;

  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = normaliseReferralCode(body?.code);
  if (!code) return json({ ok: false, error: "Invalid link." }, 400);

  const cookies = AFFILIATE_CONFIG.cookies;
  const existingVisitor = req.cookies.get(cookies.visitor)?.value;
  const visitorId = isVisitorId(existingVisitor) ? existingVisitor : randomBytes(18).toString("base64url");
  const now = Date.now();
  const result = await recordAffiliateClick(firestoreRepo(db()), { code, visitorId, now });

  const res = json({ ok: true });
  const secure = { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" };
  if (!isVisitorId(existingVisitor)) res.cookies.set(cookies.visitor, visitorId, { ...secure, maxAge: 2 * YEAR_S });

  const secret = process.env.AFFILIATE_COOKIE_SECRET ?? "";
  if (result.active && secret) {
    const prev = readAttribution(req.cookies.get(cookies.attribution)?.value, secret);
    const next = nextAttribution(prev, code, now);
    res.cookies.set(cookies.attribution, signAttribution(next, secret), { ...secure, expires: new Date(attributionExpiresAt(next)) });
  }
  return res;
}
