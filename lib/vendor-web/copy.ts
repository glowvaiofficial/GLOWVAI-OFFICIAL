// Plain-language copy for store states, support categories and dates. Pure, so the same words appear on every screen.

import type { VendorStateName } from "./types";

export type ChipTone = "ok" | "warn" | "bad" | "info" | "neutral";

export const STATE_COPY: Record<VendorStateName, { label: string; tone: ChipTone; summary: string }> = {
  NO_APPLICATION: { label: "Not started", tone: "neutral", summary: "Tell us about your store to start selling on GlowVai." },
  SUBMITTED: { label: "Submitted", tone: "info", summary: "We have your application and will review it soon." },
  UNDER_REVIEW: { label: "Under review", tone: "info", summary: "Our team is checking your store details. You cannot edit the application while it is being reviewed." },
  DOCUMENTS_REQUESTED: { label: "More information needed", tone: "warn", summary: "Our team needs a few things before we can approve your store." },
  REJECTED: { label: "Not approved", tone: "bad", summary: "We could not approve this application. You can change it and send it again." },
  APPROVED_ACTIVE: { label: "Approved", tone: "ok", summary: "Your store is approved and taking orders." },
  APPROVED_PAUSED: { label: "Approved, paused", tone: "warn", summary: "Your store is approved but paused. Orders will not reach you until it is switched on." },
  SUSPENDED: { label: "Suspended", tone: "bad", summary: "Your store is suspended. You cannot take orders right now." },
};

/** States in which the application can still be edited and sent again (lib/vendor/state.ts EDITABLE_STATES, without NO_APPLICATION). */
export const RESUBMIT_STATES: readonly VendorStateName[] = ["SUBMITTED", "DOCUMENTS_REQUESTED", "REJECTED"];

export function canEditApplication(state: VendorStateName | null | undefined): boolean {
  return state === "NO_APPLICATION" || (state !== undefined && state !== null && RESUBMIT_STATES.includes(state));
}

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  ORDER_DELAY: "Order delay",
  CANCELLATION_REQUEST: "Cancellation request",
  WRONG_PRODUCT: "Wrong product",
  MISSING_PRODUCT: "Missing product",
  DAMAGED_PRODUCT: "Damaged product",
  DELIVERY_PROBLEM: "Delivery problem",
  PAYMENT_ISSUE: "Payment issue",
  ACCOUNT_ISSUE: "Account or profile",
  SUSPECTED_COUNTERFEIT: "Suspected counterfeit",
  PRODUCT_SAFETY: "Product safety",
};

export function supportCategoryLabel(code: string): string {
  return SUPPORT_CATEGORY_LABELS[code] ?? "Other";
}

/** Date and time in India time, e.g. "12 Nov 2026, 4:30 pm". Empty string for a missing or invalid time. */
export function formatIst(ms: number | string | null | undefined): string {
  if (ms === null || ms === undefined || ms === "") return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "Last seen" wording for the heartbeat time. Null when the time is unknown. */
export function relativeTime(ms: number | null | undefined, now: number = Date.now()): string {
  if (!ms) return "";
  const mins = Math.round((now - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatIst(ms);
}

/** Same answer whether or not the account exists, so the reset page does not reveal who has a store. */
export const RESET_CONFIRMATION = "If an account exists, we've sent a reset link.";
