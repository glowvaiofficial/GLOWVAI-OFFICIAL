import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { AFFILIATE_CONFIG } from "@/lib/shop/affiliate/config";
import { parseApplication } from "@/lib/shop/affiliate/application";
import { affiliateDashboard, applyForAffiliate } from "@/lib/shop/affiliate/store";
import { customerEligibility } from "@/lib/shop/affiliate/server";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

// The signed-in customer's affiliate dashboard: their application status, link, clicks and attributed orders. Only the
// projection in lib/shop/affiliate/projection.ts leaves the server.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "affiliate-dashboard", AFFILIATE_CONFIG.rate.dashboardPerIpPerMinute);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "affiliate-dashboard", AFFILIATE_CONFIG.rate.dashboardPerUserPerMinute);
  if (userLimited) return userLimited;

  const now = Date.now();
  const eligibility = await customerEligibility(customer.uid, now);
  const affiliate = await affiliateDashboard(firestoreRepo(db()), { uid: customer.uid, now });
  return json({ ok: true, eligibility, affiliate });
}

// Applies to the programme. One open application per customer; three attempts a day per customer.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "affiliate-apply", AFFILIATE_CONFIG.rate.applyPerIpPerDay, DAY_MS);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to apply." }, 401);
  const userLimited = limitByUser(customer.uid, "affiliate-apply", AFFILIATE_CONFIG.rate.applyPerUserPerDay, DAY_MS);
  if (userLimited) return userLimited;

  const body = await req.json().catch(() => null);
  const parsed = parseApplication(body);
  if (!parsed.ok) return json({ ok: false, field: parsed.field, error: parsed.error }, 400);

  const eligibility = await customerEligibility(customer.uid, Date.now());
  if (!eligibility.eligible) {
    return json({ ok: false, code: eligibility.reason, error: "Verify your email, or use your GlowVai account for 7 days, before you apply." }, 403);
  }

  const result = await applyForAffiliate(firestoreRepo(db()), { uid: customer.uid, application: parsed.value, now: Date.now() });
  if (!result.ok) return json({ ok: false, code: result.code, error: result.message }, 409);
  return json({ ok: true, status: "APPLIED" });
}
