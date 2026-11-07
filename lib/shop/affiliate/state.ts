// The affiliate application state machine. One table decides every move; the staff hook (admin.ts) and the tests use it.
// REJECTED and SUSPENDED need a reason. REJECTED ends that application: the customer may apply again later.
export const AFFILIATE_STATUSES = ["APPLIED", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

const TRANSITIONS: Record<AffiliateStatus, readonly AffiliateStatus[]> = {
  APPLIED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  SUSPENDED: ["APPROVED", "REJECTED"],
  REJECTED: [],
};

const REASON_REQUIRED: readonly AffiliateStatus[] = ["REJECTED", "SUSPENDED"];

// Open applications. A customer may hold one of these at a time (the one-active-application rule).
const ACTIVE: readonly AffiliateStatus[] = ["APPLIED", "UNDER_REVIEW", "APPROVED", "SUSPENDED"];

export function isAffiliateStatus(value: unknown): value is AffiliateStatus {
  return typeof value === "string" && (AFFILIATE_STATUSES as readonly string[]).includes(value);
}

export function isActiveStatus(status: AffiliateStatus): boolean {
  return ACTIVE.includes(status);
}

export function nextStatuses(from: AffiliateStatus): readonly AffiliateStatus[] {
  return TRANSITIONS[from];
}

export type TransitionCheck = { ok: true } | { ok: false; code: "INVALID_TRANSITION" | "REASON_REQUIRED"; message: string };

export function checkTransition(from: AffiliateStatus, to: AffiliateStatus, reason: string | null): TransitionCheck {
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, code: "INVALID_TRANSITION", message: `An application cannot move from ${from} to ${to}.` };
  }
  if (REASON_REQUIRED.includes(to) && (!reason || reason.trim().length < 3)) {
    return { ok: false, code: "REASON_REQUIRED", message: `A reason of at least 3 characters is required to set ${to}.` };
  }
  return { ok: true };
}
