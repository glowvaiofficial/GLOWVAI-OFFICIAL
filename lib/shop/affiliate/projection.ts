// What an affiliate may see of their own programme. The dashboard is a projection: it lists the fields below and nothing
// else. The uid, the application id, staff notes and decision reasons, the audit trail and any customer detail stay on
// the server. Pure, so the tests can check the shape directly.
import { AFFILIATE_CONFIG, CATEGORY_LABELS, CHANNEL_LABELS, AUDIENCE_LABELS, type AffiliateCategory, type AffiliateChannel, type AudienceRange } from "./config";
import { type AffiliateStatus } from "./state";
import { safeHttpUrl } from "./url";

export const COMMISSION_LINE = "Commission rates are set by GlowVai and shown here once confirmed";
export const PAYOUT_LINE = "Payouts will appear here once set up";

export type DashboardState = "NONE" | AffiliateStatus;

export interface ApplicationRecord {
  status: AffiliateStatus;
  displayName: string;
  primaryChannel: AffiliateChannel;
  channelUrl: string | null;
  audienceRange: AudienceRange;
  categories: AffiliateCategory[];
}

export interface LinkRecord {
  code: string;
  active: boolean;
}

export interface MetricsRecord {
  clicksLast30Days: number;
  clicksAllTime: number;
  attributedOrderCount: number;
  attributedOrderValueRupees: number;
}

export interface AffiliateDashboardView {
  state: DashboardState;
  statusMessage: string;
  profile: { displayName: string; channel: string; channelUrl: string | null; audience: string; categories: string[] } | null;
  link: { url: string; active: boolean } | null;
  clicks: { last30Days: number; allTime: number };
  orders: { attributedCount: number; attributedValueRupees: number; attributionWindowDays: number };
  commissionLine: string;
  payoutLine: string;
}

const MESSAGES: Record<DashboardState, string> = {
  NONE: "You are not an affiliate yet. Apply to get your own GlowVai link.",
  APPLIED: "Your application has been received and is waiting for review.",
  UNDER_REVIEW: "Your application is under review.",
  APPROVED: "You are an approved GlowVai affiliate.",
  REJECTED: "This application was not approved. You can apply again.",
  SUSPENDED: "Your affiliate account is paused. Orders placed through your link do not earn attribution while it is paused. Contact GlowVai for help.",
};

export function dashboardView(input: {
  application: ApplicationRecord | null;
  link: LinkRecord | null;
  metrics: MetricsRecord;
}): AffiliateDashboardView {
  const app = input.application;
  const state: DashboardState = app ? app.status : "NONE";
  const showLink = app !== null && app.status === "APPROVED" && input.link !== null;
  const showMetrics = showLink || (app !== null && app.status === "SUSPENDED");
  const m = input.metrics;
  return {
    state,
    statusMessage: MESSAGES[state],
    profile: app
      ? {
          displayName: app.displayName,
          channel: CHANNEL_LABELS[app.primaryChannel],
          channelUrl: safeHttpUrl(app.channelUrl),
          audience: AUDIENCE_LABELS[app.audienceRange],
          categories: app.categories.map((c) => CATEGORY_LABELS[c]),
        }
      : null,
    link: showLink && input.link ? { url: `${AFFILIATE_CONFIG.linkBase}${input.link.code}`, active: input.link.active } : null,
    clicks: showMetrics ? { last30Days: m.clicksLast30Days, allTime: m.clicksAllTime } : { last30Days: 0, allTime: 0 },
    orders: {
      attributedCount: showMetrics ? m.attributedOrderCount : 0,
      attributedValueRupees: showMetrics ? m.attributedOrderValueRupees : 0,
      attributionWindowDays: AFFILIATE_CONFIG.attributionWindowDays,
    },
    commissionLine: COMMISSION_LINE,
    payoutLine: PAYOUT_LINE,
  };
}
