// Substitution preference: what the customer wants if an item cannot be supplied. Stored on the order as
// `substitutionPreference` for the vendor and admin teams to read. Pure rules; the route writes in a transaction.
import { isCancelled, customerStatus, type Doc } from "./orderState";

export const SUBSTITUTION_PREFERENCES = ["ALLOW_SUBSTITUTE", "NO_SUBSTITUTE", "CALL_ME"] as const;
export type SubstitutionPreference = (typeof SUBSTITUTION_PREFERENCES)[number];

export const SUBSTITUTION_LABELS: Record<SubstitutionPreference, string> = {
  ALLOW_SUBSTITUTE: "Allow a similar substitute",
  NO_SUBSTITUTE: "Do not substitute",
  CALL_ME: "Call me before any change",
};

export const parseSubstitutionPreference = (value: unknown): SubstitutionPreference | null =>
  typeof value === "string" && (SUBSTITUTION_PREFERENCES as readonly string[]).includes(value) ? (value as SubstitutionPreference) : null;

// Editable only while the order is still waiting for a store or being accepted, and the GlowVai team has not started on
// it (the same test the customer cancel route uses). Once packed, the preference is fixed.
const EDITABLE_STATUSES = new Set(["PLACED", "PAYMENT_PENDING", "VENDOR_ACCEPTED"]);

export function preferenceChangeBlock(order: Doc, overlay: Doc | null | undefined): { ok: true } | { ok: false; status: number; error: string } {
  if (isCancelled(order, overlay)) return { ok: false, status: 409, error: "This order is cancelled, so its preference cannot be changed." };
  const fulfilment = String(overlay?.fulfilment ?? "").toUpperCase();
  if (fulfilment && fulfilment !== "CREATED") {
    return { ok: false, status: 409, error: "The GlowVai team has started on this order, so the preference can no longer be changed." };
  }
  const status = customerStatus(order, overlay).toUpperCase();
  if (!EDITABLE_STATUSES.has(status)) {
    return {
      ok: false,
      status: 409,
      error: status === "DELIVERED"
        ? "This order is already delivered."
        : "This order is packed, so the substitution preference can no longer be changed. Contact support if you need a change.",
    };
  }
  return { ok: true };
}
