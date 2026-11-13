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

export interface TimelineEntry {
  /** Epoch milliseconds from the order's own milestone field. */
  at: number;
  /** Fixed vendor-facing label. Never event text, staff names or customer data. */
  label: string;
}

const ms = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Milestone fields on the order, in the order they happen, with their fixed labels. */
const MILESTONES: readonly { field: string; label: string }[] = [
  { field: "vendorAcceptedAt", label: "Accepted" },
  { field: "vendorPackedAt", label: "Packed" },
  { field: "outForDeliveryAt", label: "Handed to delivery partner" },
];

/**
 * The milestones an order has recorded, oldest first. A milestone with no recorded time is left out, so an order with
 * no milestones gets an empty array. Only the order's own timestamps are read; its event log, staff names and free
 * text are never read or returned.
 */
export function orderTimeline(order: Doc): TimelineEntry[] {
  return MILESTONES.flatMap(({ field, label }) => {
    const at = ms(order[field]);
    return at ? [{ at, label }] : [];
  });
}
