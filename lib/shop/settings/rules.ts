// Pure rules for the account Settings hub: profile validation, consent dates, the language allow-list, the activity log
// (cap, cursor and PII-free message templates) and which subscription actions a status allows. No server imports, so the
// browser screens and the node tests use the same rules as the routes.
import { indianMobile, text } from "../text";

// ---- Language ----------------------------------------------------------------------------------------------------

export const LANGUAGE_CODES = ["en", "hi", "te"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

// ---- Profile -----------------------------------------------------------------------------------------------------

export const NAME_MAX = 80;
export const EMAIL_MAX = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConsentState {
  marketing: boolean;
  analytics: boolean;
  // When each current choice was made (epoch ms). Null when the customer has never been asked.
  marketingAt: number | null;
  analyticsAt: number | null;
}

export interface ProfileAddressInput {
  fullAddress: string;
  city: string;
  pincode: string;
  landmark: string;
}

export interface ProfileValue {
  name: string;
  phone: string;
  // Empty string when no email is given.
  email: string;
  address: ProfileAddressInput | null;
  // Undefined when the request did not mention consent: the stored choice is then kept.
  marketing: boolean | undefined;
  analytics: boolean | undefined;
}

export type ProfileCheck = { ok: true; value: ProfileValue } | { ok: false; field: string; error: string };

// Validates a profile save. Every refusal names the field and carries the message the customer sees.
export function validateProfileInput(body: Record<string, unknown>): ProfileCheck {
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  if (rawName.length > NAME_MAX) return { ok: false, field: "name", error: `Your name can be ${NAME_MAX} characters at most.` };
  const name = rawName;
  if (name.length < 2 || !/\p{L}/u.test(name)) return { ok: false, field: "name", error: "Enter your name." };

  const phone = indianMobile(body.phone);
  if (!phone) return { ok: false, field: "phone", error: "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9." };

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  if (rawEmail.length > EMAIL_MAX || (rawEmail && !EMAIL_PATTERN.test(rawEmail))) {
    return { ok: false, field: "email", error: "Enter a valid email, or leave it empty." };
  }

  for (const key of ["marketingOptIn", "analyticsOptIn"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") {
      return { ok: false, field: "consent", error: "Each consent choice must be on or off." };
    }
  }

  let address: ProfileAddressInput | null = null;
  if (body.address !== undefined && body.address !== null) {
    if (typeof body.address !== "object" || Array.isArray(body.address)) {
      return { ok: false, field: "address", error: "Invalid address." };
    }
    const raw = body.address as Record<string, unknown>;
    // Not cut to six characters: a 7-digit pincode is refused, not shortened into a valid-looking one.
    const pincode = text(raw.pincode, 20);
    if (pincode && !/^\d{6}$/.test(pincode)) return { ok: false, field: "pincode", error: "Enter a 6-digit pincode." };
    address = {
      fullAddress: text(raw.fullAddress, 300),
      city: text(raw.city, 60),
      pincode,
      landmark: text(raw.landmark, 120),
    };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      email: rawEmail.toLowerCase(),
      address,
      marketing: typeof body.marketingOptIn === "boolean" ? body.marketingOptIn : undefined,
      analytics: typeof body.analyticsOptIn === "boolean" ? body.analyticsOptIn : undefined,
    },
  };
}

// The consent record after a save. A choice keeps its date until it changes; a change (on or off) takes the new date.
// A choice the request does not mention is kept as it was, date included.
function choose(prevValue: boolean, prevAt: number | null, requested: boolean | undefined, now: number): { value: boolean; at: number | null } {
  if (requested === undefined) return { value: prevValue, at: prevAt };
  // A first answer, or a change either way, is dated now. The same answer again keeps the earlier date.
  if (prevAt === null || requested !== prevValue) return { value: requested, at: now };
  return { value: prevValue, at: prevAt };
}

export function nextConsents(previous: ConsentState, value: { marketing: boolean | undefined; analytics: boolean | undefined }, now: number): ConsentState {
  const marketing = choose(previous.marketing, previous.marketingAt, value.marketing, now);
  const analytics = choose(previous.analytics, previous.analyticsAt, value.analytics, now);
  return { marketing: marketing.value, marketingAt: marketing.at, analytics: analytics.value, analyticsAt: analytics.at };
}

// ---- Activity log ------------------------------------------------------------------------------------------------

export const ACTIVITY_CAP = 200;
export const ACTIVITY_PAGE_MAX = 50;

export const ACTIVITY_TYPES = [
  "profile_updated",
  "phone_updated",
  "email_updated",
  "consent_updated",
  "language_changed",
  "address_added",
  "address_updated",
  "address_removed",
  "wishlist_changed",
  "review_submitted",
  "return_requested",
  "subscription_started",
  "subscription_changed",
  "notification_settings_changed",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

// The stored message for each type. Fixed copy only: no name, phone, email, address, amount, product or order id.
export const ACTIVITY_MESSAGES: Record<ActivityType, string> = {
  profile_updated: "Profile updated",
  phone_updated: "Phone number updated",
  email_updated: "Email updated",
  consent_updated: "Privacy choices updated",
  language_changed: "Language changed",
  address_added: "Address added",
  address_updated: "Address updated",
  address_removed: "Address removed",
  wishlist_changed: "Wishlist changed",
  review_submitted: "Review submitted",
  return_requested: "Return requested",
  subscription_started: "Subscription started",
  subscription_changed: "Subscription changed",
  notification_settings_changed: "Notification settings changed",
};

export interface StoredActivity {
  id: string;
  createdAt: number;
}

// Ids to delete before a new entry is written, so that at most `cap` remain afterwards: keeps the newest cap-1.
export function planActivityTrim(existing: StoredActivity[], cap = ACTIVITY_CAP): string[] {
  const newestFirst = [...existing].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  return newestFirst.slice(Math.max(0, cap - 1)).map((a) => a.id);
}

export interface ActivityView {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: number;
}

export function activityPageLimit(raw: string | null): number {
  const n = Math.floor(Number(raw ?? 20));
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, ACTIVITY_PAGE_MAX);
}

// Cursor = "<createdAt>_<id>" of the last entry of a page. Opaque to the app; the server checks it.
export function encodeActivityCursor(createdAt: number, id: string): string {
  return `${createdAt}_${id}`;
}

export function decodeActivityCursor(value: string | null): { createdAt: number; id: string } | null {
  if (!value) return null;
  const match = /^(\d{1,15})_([A-Za-z0-9_-]{1,140})$/.exec(value);
  return match ? { createdAt: Number(match[1]), id: match[2] } : null;
}

// ---- Returns ------------------------------------------------------------------------------------------------------

// Days after delivery in which a return or replacement can be asked for. Same value as RETURN_WINDOW_MS in
// lib/shop/returns.ts (the server rule); a test keeps the two equal. Kept here so the browser never loads that module.
export const RETURN_WINDOW_DAYS = 7;

// ---- Subscriptions -----------------------------------------------------------------------------------------------

export type SettingsSubscriptionAction = "pause" | "resume" | "quantity" | "cancel";

// The actions a customer may take on a subscription in each status. The server's transition() enforces the same rule;
// the screen only shows the buttons that are allowed.
export function subscriptionActionsFor(status: string): SettingsSubscriptionAction[] {
  if (status === "ACTIVE") return ["pause", "quantity", "cancel"];
  if (status === "PAUSED") return ["resume", "quantity", "cancel"];
  return [];
}
