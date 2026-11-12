// Delay records for an order: the reasons staff may set, and the checks run before a delay is written. Pure (no server
// imports), so the tests can run the exact rules that lib/shop/delay.ts applies.

export const DELAY_REASONS = ["TRAFFIC", "STORE_BUSY", "RAIN"] as const;
export type DelayReason = (typeof DELAY_REASONS)[number];

// A new arrival time may be at most this far ahead of now. A delay banner also stops showing after this long.
export const DELAY_MAX_AHEAD_MS = 3 * 60 * 60_000;
export const DELAY_BANNER_TTL_MS = 3 * 60 * 60_000;

export const isDelayReason = (value: unknown): value is DelayReason => typeof value === "string" && (DELAY_REASONS as readonly string[]).includes(value);

export const STAFF_UID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

export interface DelayActor {
  role: "STAFF";
  uid: string;
  name: string;
}

export type DelayValidation = { ok: true; reason: DelayReason; newArrivalAt: number } | { ok: false; error: string };

// Reason must be on the list. The new arrival time must be a whole epoch-millisecond value, after now, and no more than
// three hours ahead.
export function validateDelayInput(reason: unknown, newArrivalAt: unknown, now: number): DelayValidation {
  if (!isDelayReason(reason)) return { ok: false, error: "Choose a delay reason: traffic, store busy or rain." };
  if (typeof newArrivalAt !== "number" || !Number.isInteger(newArrivalAt)) {
    return { ok: false, error: "Enter the new arrival time." };
  }
  if (newArrivalAt <= now) return { ok: false, error: "The new arrival time must be in the future." };
  if (newArrivalAt > now + DELAY_MAX_AHEAD_MS) return { ok: false, error: "The new arrival time can be at most 3 hours ahead." };
  return { ok: true, reason, newArrivalAt };
}

export function validateDelayActor(actor: unknown): { ok: true; actor: DelayActor } | { ok: false; error: string } {
  const a = (actor ?? {}) as Partial<DelayActor>;
  if (a.role !== "STAFF") return { ok: false, error: "Only the GlowVai team can set a delay." };
  if (typeof a.uid !== "string" || !STAFF_UID_PATTERN.test(a.uid)) return { ok: false, error: "Only the GlowVai team can set a delay." };
  if (typeof a.name !== "string" || a.name.trim().length === 0 || a.name.length > 80) return { ok: false, error: "The staff member's name is needed for the record." };
  return { ok: true, actor: { role: "STAFF", uid: a.uid, name: a.name.trim() } };
}
