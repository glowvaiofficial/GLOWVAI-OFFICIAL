// What the vendor app shows about an order beyond its items: the customer's substitution preference (read-only, the
// packer must know it) and the stage timeline (accepted, packed, handed to a rider). Pure functions, no customer PII.
import { SUBSTITUTION_LABELS, parseSubstitutionPreference, type SubstitutionPreference } from "../shop/preferences";

type Doc = Record<string, unknown>;

/** Packer copy for each preference. Vendors cannot change the preference. */
export const SUBSTITUTION_VENDOR_COPY: Record<SubstitutionPreference, { label: string; hint: string; tone: "ok" | "warn" | "info" }> = {
  ALLOW_SUBSTITUTE: {
    label: SUBSTITUTION_LABELS.ALLOW_SUBSTITUTE,
    hint: "If an item is out of stock, the customer accepts a similar product.",
    tone: "ok",
  },
  NO_SUBSTITUTE: {
    label: SUBSTITUTION_LABELS.NO_SUBSTITUTE,
    hint: "Do not send a different product. Report any missing item instead.",
    tone: "warn",
  },
  CALL_ME: {
    label: SUBSTITUTION_LABELS.CALL_ME,
    hint: "Do not change anything before the GlowVai team has called the customer.",
    tone: "info",
  },
};

export interface SubstitutionView {
  value: SubstitutionPreference;
  label: string;
  hint: string;
  tone: "ok" | "warn" | "info";
  /** Always false: vendors cannot change the preference. */
  canChange: false;
}

/** The packer's view of a stored preference, or null when the order has none (older orders). */
export function substitutionForVendor(raw: unknown): SubstitutionView | null {
  const value = parseSubstitutionPreference(raw);
  if (!value) return null;
  const copy = SUBSTITUTION_VENDOR_COPY[value];
  return { value, label: copy.label, hint: copy.hint, tone: copy.tone, canChange: false };
}

export type TimelineStage = "ACCEPTED" | "PACKED" | "HANDED_TO_RIDER";

export interface TimelineStep {
  stage: TimelineStage;
  at: number | null;
}

const ms = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const RIDER_EVENT = /out for delivery/i;
const PAST_HANDOVER = new Set(["OUT_FOR_DELIVERY", "DISPATCHED", "DELIVERED"]);

/**
 * The stages an order has reached, in order, with their times. Only reached stages are returned. The handover time is
 * the first event whose text says "Out for delivery" (the rider app writes that event); the event text itself is never
 * returned, only the stage and its time.
 */
export function orderTimeline(order: Doc): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const accepted = ms(order.vendorAcceptedAt);
  if (accepted) steps.push({ stage: "ACCEPTED", at: accepted });
  const packed = ms(order.vendorPackedAt);
  if (packed) steps.push({ stage: "PACKED", at: packed });

  const status = typeof order.status === "string" ? order.status.toUpperCase() : "";
  if (PAST_HANDOVER.has(status)) {
    const events = Array.isArray(order.events) ? (order.events as Doc[]) : [];
    const handover = events.find((e) => typeof e?.event === "string" && RIDER_EVENT.test(e.event as string));
    steps.push({ stage: "HANDED_TO_RIDER", at: handover ? ms(handover.at) || null : null });
  }
  return steps;
}
