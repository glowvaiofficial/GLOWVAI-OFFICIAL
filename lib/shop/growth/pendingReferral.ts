// A friend's referral code from a share link (glowvai.in/shop?ref=CODE), kept on the device until the visitor signs in
// with a phone account; the shop then applies it once through /api/shop/referral/apply. Browser-safe and pure (the
// storage is passed in), so the website's ReferralCapture, the shop app and the tests share it. The server still checks
// every code: this only decides what is worth sending.
import { GROWTH_CONFIG } from "../growth-config";

export const PENDING_REFERRAL_KEY = "glowvai_pending_referral_v1";
// The last code the server applied or refused on this device, so reopening the same link does not send it again.
export const HANDLED_REFERRAL_KEY = "glowvai_referral_handled_v1";
// A link opened more than 30 days before sign-in is not applied.
export const PENDING_REFERRAL_MAX_AGE_MS = 30 * 86_400_000;

const { codeAlphabet, codeLength } = GROWTH_CONFIG.referral;
const SHAPE = new RegExp(`^[${codeAlphabet}]{${codeLength}}$`);

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface PendingReferral {
  code: string;
  savedAt: number;
}

// The customer referral code in a link's ref value, or "" when it is not one. Same normalisation as the server
// (lib/shop/growth/codes.ts): case, spaces and dashes are ignored. Old partner ids (GLV-AUTO-..., GLV-STUDENT-...) are
// never codes; they stay with the partner portal.
export function referralCodeFromLink(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (/^GLV-/i.test(raw)) return "";
  const cleaned = raw.toUpperCase().replace(/[\s-]/g, "");
  return SHAPE.test(cleaned) ? cleaned : "";
}

export function savePendingReferral(store: Store, code: string, now: number): boolean {
  const clean = referralCodeFromLink(code);
  if (!clean) return false;
  try {
    if (store.getItem(HANDLED_REFERRAL_KEY) === clean) return false;
    store.setItem(PENDING_REFERRAL_KEY, JSON.stringify({ code: clean, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

// Removes the stored code. handledCode marks a code the server has answered for, so the same link is not sent again.
export function clearPendingReferral(store: Store, handledCode?: string): void {
  try {
    store.removeItem(PENDING_REFERRAL_KEY);
    if (handledCode) store.setItem(HANDLED_REFERRAL_KEY, handledCode);
  } catch {
    // Storage blocked: nothing was kept.
  }
}

// The stored code, or null. A damaged or expired record is removed.
export function readPendingReferral(store: Store, now: number): PendingReferral | null {
  let raw: string | null = null;
  try {
    raw = store.getItem(PENDING_REFERRAL_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PendingReferral>;
    const code = referralCodeFromLink(v.code);
    const savedAt = typeof v.savedAt === "number" && Number.isFinite(v.savedAt) ? v.savedAt : NaN;
    if (code && savedAt <= now && now - savedAt < PENDING_REFERRAL_MAX_AGE_MS) return { code, savedAt };
  } catch {
    // Damaged record: removed below.
  }
  clearPendingReferral(store);
  return null;
}

// What to do with the stored code after an apply call. applied and refused (a bad, unknown or own code, a code already
// used, or an account that has ordered before: the route answers 400) remove it; anything else (offline, signed out,
// rate limited, server error) keeps it for the next sign-in.
export type ApplyOutcome = "applied" | "refused" | "retry";

export function applyOutcome(result: { ok: boolean; status: number }): ApplyOutcome {
  if (result.ok) return "applied";
  return result.status === 400 ? "refused" : "retry";
}
