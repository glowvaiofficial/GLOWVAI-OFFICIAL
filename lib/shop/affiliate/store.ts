// Affiliate data, through the growth repo interface (the Admin SDK in production, an in-memory repo in tests). Every write
// happens in a transaction, and every transaction reads everything it needs before its first write.
//
// Collections (Admin SDK only; no Firestore rules change):
//   affiliateApplications/{id}  one document per application (status, profile fields, decision fields)
//   affiliateUsers/{uid}        pointer: activeApplicationId (one open application at a time), lastApplicationId, linkCode
//   affiliateLinks/{code}       one link per affiliate: owner uid, active flag
//   affiliateDaily/{code}_{day} daily click counts per link (the only click data kept)
//   affiliateClickSeen/{hash}   dedupe marker: hash of (visitor id, code, day), expires; no raw id, no IP
//   affiliateAudit/{id}         staff decisions: who, when, what changed, reason (no customer contact details)
import { randomBytes } from "node:crypto";
import { generateReferralCode } from "../growth/codes";
import { codePath } from "../growth/referrals";
import type { GrowthRepo, GrowthTx } from "../growth/repo";
import { AFFILIATE_CONFIG } from "./config";
import type { ParsedApplication } from "./application";
import { attributedCode, readAttribution, utcDay, visitorClickKey, type AttributionCookie } from "./attribution";
import { dashboardView, type AffiliateDashboardView, type ApplicationRecord, type LinkRecord, type MetricsRecord } from "./projection";
import type { AffiliateStatus } from "./state";

const DAY_MS = 86_400_000;

export const applicationPath = (id: string) => `affiliateApplications/${id}`;
export const userPath = (uid: string) => `affiliateUsers/${uid}`;
export const linkPath = (code: string) => `affiliateLinks/${code}`;
export const dailyPath = (code: string, day: string) => `affiliateDaily/${code}_${day}`;
export const clickSeenPath = (key: string) => `affiliateClickSeen/${key}`;
export const auditPath = (id: string) => `affiliateAudit/${id}`;

export const newId = (): string => randomBytes(12).toString("base64url");

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Reads a free affiliate code: not a referral code and not already a link. Reads only, so callers may use it inside a
// transaction before their first write.
export async function pickFreeCode(tx: GrowthTx, repo: GrowthRepo, generate: () => string = generateReferralCode): Promise<string | null> {
  for (let attempt = 0; attempt < AFFILIATE_CONFIG.maxCodeAttempts; attempt++) {
    const candidate = generate();
    const referral = await tx.get(repo.ref(codePath(candidate)));
    const link = await tx.get(repo.ref(linkPath(candidate)));
    if (!referral.exists && !link.exists) return candidate;
  }
  return null;
}

export type ApplyResult = { ok: true; applicationId: string } | { ok: false; code: "ALREADY_ACTIVE"; message: string };

// Creates an application for a customer. One open application at a time: the pointer is read in the same transaction
// that creates the application, so two simultaneous requests cannot both succeed.
export async function applyForAffiliate(
  repo: GrowthRepo,
  input: { uid: string; application: ParsedApplication; now: number; applicationId?: string },
): Promise<ApplyResult> {
  const id = input.applicationId ?? newId();
  return repo.runTx(async (tx): Promise<ApplyResult> => {
    const user = await tx.get(repo.ref(userPath(input.uid)));
    if (str(user.data()?.activeApplicationId)) {
      return { ok: false, code: "ALREADY_ACTIVE", message: "You already have an affiliate application open." };
    }
    const a = input.application;
    tx.create(repo.ref(applicationPath(id)), {
      uid: input.uid,
      status: "APPLIED",
      displayName: a.displayName,
      primaryChannel: a.primaryChannel,
      channelUrl: a.channelUrl,
      audienceRange: a.audienceRange,
      categories: a.categories,
      complianceVersion: a.complianceVersion,
      complianceAcceptedAt: input.now,
      linkCode: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
    tx.set(repo.ref(userPath(input.uid)), { uid: input.uid, activeApplicationId: id, lastApplicationId: id, updatedAt: input.now }, { merge: true });
    return { ok: true, applicationId: id };
  });
}

export interface LoadedAffiliate {
  applicationId: string | null;
  application: (ApplicationRecord & { uid: string; decisionAt: number | null }) | null;
  link: (LinkRecord & { uid: string }) | null;
}

// The customer's current application (open, or the most recent one) and link. Internal fields are returned here for the
// server only; the dashboard projection decides what leaves the server.
export async function loadAffiliate(repo: GrowthRepo, uid: string): Promise<LoadedAffiliate> {
  const user = (await repo.get(repo.ref(userPath(uid)))).data() ?? {};
  const applicationId = str(user.activeApplicationId) || str(user.lastApplicationId) || null;
  if (!applicationId) return { applicationId: null, application: null, link: null };
  const snap = await repo.get(repo.ref(applicationPath(applicationId)));
  const d = snap.data();
  if (!snap.exists || !d || d.uid !== uid) return { applicationId: null, application: null, link: null };
  const status = d.status as AffiliateStatus;
  const linkCode = str(d.linkCode) || str(user.linkCode);
  let link: LoadedAffiliate["link"] = null;
  if (linkCode) {
    const l = await repo.get(repo.ref(linkPath(linkCode)));
    if (l.exists && l.data()?.uid === uid) link = { code: linkCode, active: l.data()?.active === true, uid };
  }
  return {
    applicationId,
    application: {
      uid,
      status,
      displayName: str(d.displayName),
      primaryChannel: d.primaryChannel as ApplicationRecord["primaryChannel"],
      channelUrl: typeof d.channelUrl === "string" ? d.channelUrl : null,
      audienceRange: d.audienceRange as ApplicationRecord["audienceRange"],
      categories: Array.isArray(d.categories) ? (d.categories as ApplicationRecord["categories"]) : [],
      decisionAt: typeof d.decidedAt === "number" ? d.decidedAt : null,
    },
    link,
  };
}

// Click and order totals for one link. Counts only: no customer names, contact details or order ids.
export async function metricsFor(repo: GrowthRepo, code: string | null, now: number): Promise<MetricsRecord> {
  if (!code) return { clicksLast30Days: 0, clicksAllTime: 0, attributedOrderCount: 0, attributedOrderValueRupees: 0 };
  const since = utcDay(now - 30 * DAY_MS);
  const days = await repo.query("affiliateDaily", [["code", "==", code]], { limit: AFFILIATE_CONFIG.metricRowLimit });
  let clicksLast30Days = 0;
  let clicksAllTime = 0;
  for (const row of days) {
    const clicks = Number(row.data()?.clicks ?? 0);
    clicksAllTime += clicks;
    if (str(row.data()?.day) >= since) clicksLast30Days += clicks;
  }
  const orders = await repo.query("orders", [["affiliateCode", "==", code]], { limit: AFFILIATE_CONFIG.metricRowLimit });
  let attributedOrderCount = 0;
  let attributedOrderValueRupees = 0;
  for (const o of orders) {
    const d = o.data() ?? {};
    if (d.status === "CANCELLED") continue;
    attributedOrderCount++;
    const total = Number((d.pricing as { grandTotal?: unknown } | undefined)?.grandTotal ?? 0);
    if (Number.isFinite(total) && total > 0) attributedOrderValueRupees += Math.round(total);
  }
  return { clicksLast30Days, clicksAllTime, attributedOrderCount, attributedOrderValueRupees };
}

export async function affiliateDashboard(repo: GrowthRepo, input: { uid: string; now: number }): Promise<AffiliateDashboardView> {
  const loaded = await loadAffiliate(repo, input.uid);
  const metrics = await metricsFor(repo, loaded.link?.code ?? null, input.now);
  const app = loaded.application;
  return dashboardView({
    application: app
      ? {
          status: app.status,
          displayName: app.displayName,
          primaryChannel: app.primaryChannel,
          channelUrl: app.channelUrl,
          audienceRange: app.audienceRange,
          categories: app.categories,
        }
      : null,
    link: loaded.link ? { code: loaded.link.code, active: loaded.link.active } : null,
    metrics,
  });
}

export type ClickResult = { active: boolean; counted: boolean };

// One click on an affiliate link. Counted once per visitor per link per day (UTC). An inactive or unknown link counts
// nothing and is reported as inactive, so the route can skip setting the attribution cookie.
export async function recordAffiliateClick(repo: GrowthRepo, input: { code: string; visitorId: string; now: number }): Promise<ClickResult> {
  const day = utcDay(input.now);
  const key = visitorClickKey(input.visitorId, input.code, day);
  return repo.runTx(async (tx): Promise<ClickResult> => {
    const link = await tx.get(repo.ref(linkPath(input.code)));
    if (!link.exists || link.data()?.active !== true) return { active: false, counted: false };
    const seen = await tx.get(repo.ref(clickSeenPath(key)));
    const daily = await tx.get(repo.ref(dailyPath(input.code, day)));
    if (seen.exists) return { active: true, counted: false };
    tx.create(repo.ref(clickSeenPath(key)), { code: input.code, day, expiresAt: input.now + AFFILIATE_CONFIG.clickSeenKeepDays * DAY_MS });
    tx.set(
      repo.ref(dailyPath(input.code, day)),
      { code: input.code, day, clicks: Number(daily.data()?.clicks ?? 0) + 1, updatedAt: input.now },
      { merge: true },
    );
    return { active: true, counted: true };
  });
}

// The affiliate code that earns this order, or null. Refused: a bad or forged cookie, a closed window, an unknown or
// inactive link, and an order by the affiliate on their own link (no self-referral).
export async function affiliateCodeForOrder(
  repo: GrowthRepo,
  input: { uid: string; cookie: string | undefined; secret: string | undefined; now: number },
): Promise<string | null> {
  const cookie: AttributionCookie | null = readAttribution(input.cookie, input.secret ?? "");
  const code = attributedCode(cookie, input.now);
  if (!code) return null;
  const link = await repo.get(repo.ref(linkPath(code)));
  if (!link.exists || link.data()?.active !== true) return null;
  if (link.data()?.uid === input.uid) return null;
  return code;
}
