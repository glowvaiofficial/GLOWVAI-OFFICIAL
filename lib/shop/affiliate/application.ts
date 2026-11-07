// The affiliate application form: validation of what the customer sends, and who may apply. Pure (no server imports).
import { AFFILIATE_CONFIG, type AffiliateCategory, type AffiliateChannel, type AudienceRange } from "./config";
import { validateUrl } from "./url";

export interface ParsedApplication {
  displayName: string;
  primaryChannel: AffiliateChannel;
  channelUrl: string | null;
  audienceRange: AudienceRange;
  categories: AffiliateCategory[];
  complianceVersion: string;
}

export type ApplicationParse = { ok: true; value: ParsedApplication } | { ok: false; field: string; error: string };

// First name and an optional initial is enough ("Priya", "Priya S."). Letters, spaces, dots, apostrophes and hyphens only:
// no digits, no "@", no links.
const DISPLAY_NAME = /^[\p{L}][\p{L}\p{M}'. -]*$/u;

const fail = (field: string, error: string): ApplicationParse => ({ ok: false, field, error });

export function parseApplication(body: unknown): ApplicationParse {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("form", "Invalid request.");
  const b = body as Record<string, unknown>;

  const displayName = typeof b.displayName === "string" ? b.displayName.trim().replace(/\s+/g, " ") : "";
  if (displayName.length < AFFILIATE_CONFIG.displayNameMin || displayName.length > AFFILIATE_CONFIG.displayNameMax) {
    return fail("displayName", `Use between ${AFFILIATE_CONFIG.displayNameMin} and ${AFFILIATE_CONFIG.displayNameMax} characters, such as your first name and an initial.`);
  }
  if (!DISPLAY_NAME.test(displayName)) return fail("displayName", "Use letters only, for example Priya S. Digits, links and symbols are not allowed.");

  const channel = AFFILIATE_CONFIG.channels.find((c) => c === b.primaryChannel);
  if (!channel) return fail("primaryChannel", "Choose where you mainly share (Instagram, YouTube, blog, WhatsApp group or other).");

  const url = validateUrl(b.channelUrl, { maxLength: AFFILIATE_CONFIG.channelUrlMax });
  if (!url.ok) return fail("channelUrl", url.error);

  const range = AFFILIATE_CONFIG.audienceRanges.find((r) => r === b.audienceRange);
  if (!range) return fail("audienceRange", "Choose your audience size range.");

  if (!Array.isArray(b.categories) || b.categories.length < 1) return fail("categories", "Choose at least one category.");
  if (b.categories.length > AFFILIATE_CONFIG.maxCategories) return fail("categories", "Choose up to six categories.");
  const categories: AffiliateCategory[] = [];
  for (const c of b.categories) {
    const match = AFFILIATE_CONFIG.categories.find((k) => k === c);
    if (!match) return fail("categories", "One of the categories is not recognised.");
    if (!categories.includes(match)) categories.push(match);
  }

  // The customer must accept the rules shown on the form, the same version the server holds.
  if (b.complianceVersion !== AFFILIATE_CONFIG.complianceVersion) return fail("compliance", "The affiliate rules have changed. Reload the page and read them again.");
  if (b.complianceAccepted !== true) return fail("compliance", "Read and accept the affiliate rules to apply.");

  return {
    ok: true,
    value: {
      displayName,
      primaryChannel: channel,
      channelUrl: url.url,
      audienceRange: range,
      categories,
      complianceVersion: AFFILIATE_CONFIG.complianceVersion,
    },
  };
}

export type Eligibility = { eligible: true; basis: "VERIFIED_EMAIL" | "ACCOUNT_AGE" } | { eligible: false; reason: "ACCOUNT_TOO_NEW" };

// A verified email is enough. Without one (an anonymous account, or an unverified email) the account must have existed
// for minAccountAgeDays. Unknown creation times are refused.
export function affiliateEligibility(input: { emailVerified: boolean; accountCreatedAt: number | null; now: number }): Eligibility {
  if (input.emailVerified) return { eligible: true, basis: "VERIFIED_EMAIL" };
  const dayMs = 86_400_000;
  if (input.accountCreatedAt !== null && input.now - input.accountCreatedAt >= AFFILIATE_CONFIG.minAccountAgeDays * dayMs) {
    return { eligible: true, basis: "ACCOUNT_AGE" };
  }
  return { eligible: false, reason: "ACCOUNT_TOO_NEW" };
}
