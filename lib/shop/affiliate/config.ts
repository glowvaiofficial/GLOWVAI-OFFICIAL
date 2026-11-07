// GlowVai Affiliate programme: the numbers and lists the routes and modules share. Plain data, no server imports, so the
// browser pages can read the same lists the server checks. Commission rates are deliberately absent: GlowVai sets them
// and the dashboard shows them once they are confirmed.
import { GROWTH_CONFIG } from "../growth-config";

export const AFFILIATE_CONFIG = {
  // The link an approved affiliate shares. The code is the same kind of code as a referral code (growth/codes.ts).
  linkBase: "https://glowvai.in/shop?ref=",
  codeLength: GROWTH_CONFIG.referral.codeLength,
  codeAlphabet: GROWTH_CONFIG.referral.codeAlphabet,
  maxCodeAttempts: GROWTH_CONFIG.referral.maxCodeAttempts,
  // Attribution: 30 days from the first click; the most recent affiliate click inside that window gets the order.
  attributionWindowDays: 30,
  // Eligibility: a verified email, or an account that has existed for this many days (anonymous accounts included).
  minAccountAgeDays: 7,
  // Rate limits (requests per window, per IP or per signed-in customer).
  rate: {
    applyPerUserPerDay: 3,
    applyPerIpPerDay: 10,
    clickPerIpPerMinute: 60,
    dashboardPerUserPerMinute: 60,
    dashboardPerIpPerMinute: 120,
  },
  // Cookies: the signed attribution cookie and a random visitor id (only its hash is ever stored).
  cookies: { attribution: "gv_aff", visitor: "gv_vid" },
  displayNameMin: 2,
  displayNameMax: 40,
  channelUrlMax: 300,
  reasonMax: 500,
  maxCategories: 6,
  // Dashboard numbers read at most this many rows (daily click rows, attributed orders).
  metricRowLimit: 500,
  // Click-dedupe marker documents carry an expiresAt this many days ahead (for a Firestore TTL policy).
  clickSeenKeepDays: 40,
  complianceVersion: "2026-11-affiliate-rules-v1",
  channels: ["INSTAGRAM", "YOUTUBE", "BLOG", "WHATSAPP_GROUP", "OTHER"] as const,
  audienceRanges: ["UNDER_1K", "1K_TO_10K", "10K_TO_100K", "100K_PLUS"] as const,
  categories: ["SKINCARE", "HAIRCARE", "MAKEUP", "FRAGRANCE", "BATH_BODY", "WELLNESS"] as const,
} as const;

export type AffiliateChannel = (typeof AFFILIATE_CONFIG.channels)[number];
export type AudienceRange = (typeof AFFILIATE_CONFIG.audienceRanges)[number];
export type AffiliateCategory = (typeof AFFILIATE_CONFIG.categories)[number];

export const CHANNEL_LABELS: Record<AffiliateChannel, string> = {
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  BLOG: "Blog or website",
  WHATSAPP_GROUP: "WhatsApp group",
  OTHER: "Other",
};

export const AUDIENCE_LABELS: Record<AudienceRange, string> = {
  UNDER_1K: "Under 1,000",
  "1K_TO_10K": "1,000 to 10,000",
  "10K_TO_100K": "10,000 to 100,000",
  "100K_PLUS": "100,000 or more",
};

export const CATEGORY_LABELS: Record<AffiliateCategory, string> = {
  SKINCARE: "Skincare",
  HAIRCARE: "Haircare",
  MAKEUP: "Makeup",
  FRAGRANCE: "Fragrance",
  BATH_BODY: "Bath and body",
  WELLNESS: "Wellness",
};

// Shown on the apply form; the version is stored with each application. It states only rules the programme enforces:
// no rates and no payment terms.
export const AFFILIATE_COMPLIANCE_TEXT =
  "I will say that I am a GlowVai affiliate wherever I share my link. I will not make medical claims or promise results for any product. " +
  "I will not send spam, use misleading ads, or bid on GlowVai brand names. I will not use my own link to buy from GlowVai. " +
  "I have read the affiliate terms and agree to follow them.";
