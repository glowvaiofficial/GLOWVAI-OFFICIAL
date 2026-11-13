// Offer rules and promo codes, set by the admin (Firestore collection "offers"). Pure: no Firebase here, so the same
// rules run for the cart quote, for the order and in tests. Every number is checked again on read.

export const OFFER_CODE_PATTERN = /^[A-Z0-9_-]{3,20}$/;

export interface Offer {
  id: string;
  code: string;
  name: string;
  type: "flat" | "percent";
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
  category: string | null;
  startsAt: number | null;
  endsAt: number | null;
  enabled: boolean;
  perCustomerLimit: number;
  totalLimit: number | null;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return OFFER_CODE_PATTERN.test(code) ? code : null;
}

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

// A stored offer, or null when anything is missing or out of range (such an offer is never applied).
export function readOffer(id: string, raw: unknown): Offer | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const code = normalizeCode(d.code);
  const name = typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= 60 ? d.name : null;
  const type = d.type === "flat" || d.type === "percent" ? d.type : null;
  const value = type === "percent" ? int(d.value, 1, 50) : type === "flat" ? int(d.value, 1, 5000) : null;
  const hasMax = d.maxDiscount !== null && d.maxDiscount !== undefined;
  const maxDiscount = hasMax ? int(d.maxDiscount, 1, 5000) : null;
  const minSubtotal = int(d.minSubtotal, 0, 50000);
  const category =
    d.category === null || d.category === undefined
      ? null
      : typeof d.category === "string" && d.category.length > 0 && d.category.length <= 60
        ? d.category
        : undefined;
  const startsAt = typeof d.startsAt === "number" && d.startsAt > 0 ? d.startsAt : null;
  const endsAt = typeof d.endsAt === "number" && d.endsAt > 0 ? d.endsAt : null;
  const perCustomerLimit = d.perCustomerLimit === undefined ? 1 : int(d.perCustomerLimit, 1, 20);
  const totalLimit = d.totalLimit === null || d.totalLimit === undefined ? null : int(d.totalLimit, 1, 100000);
  if (!code || !name || !type || value === null || minSubtotal === null || category === undefined || perCustomerLimit === null) return null;
  if (totalLimit === undefined) return null;
  if (type === "flat" && hasMax) return null;
  if (type === "percent" && hasMax && maxDiscount === null) return null;
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) return null;
  return { id, code, name, type, value, maxDiscount, minSubtotal, category, startsAt, endsAt, enabled: d.enabled === true, perCustomerLimit, totalLimit };
}

export interface OfferLine {
  productId: string;
  category: string;
  total: number;
}

export interface OfferUsage {
  total: number;
  forCustomer: number;
}

export type OfferResult = { ok: true; discount: number; label: string } | { ok: false; error: string };

export function evaluateOffer(offer: Offer, lines: OfferLine[], now: number, usage: OfferUsage): OfferResult {
  if (!offer.enabled) return { ok: false, error: "That coupon code is not valid." };
  if (offer.startsAt !== null && now < offer.startsAt) return { ok: false, error: "This offer has not started yet." };
  if (offer.endsAt !== null && now >= offer.endsAt) return { ok: false, error: "This offer has ended." };
  if (offer.totalLimit !== null && usage.total >= offer.totalLimit) return { ok: false, error: "This offer is fully used." };
  if (usage.forCustomer >= offer.perCustomerLimit) return { ok: false, error: "You have already used this code." };
  const eligible = lines.filter((l) => offer.category === null || l.category === offer.category);
  const eligibleTotal = eligible.reduce((s, l) => s + l.total, 0);
  if (eligible.length === 0 || eligibleTotal <= 0) return { ok: false, error: "This code does not apply to the items in your bag." };
  if (eligibleTotal < offer.minSubtotal) {
    return { ok: false, error: `Add ₹${offer.minSubtotal - eligibleTotal} more of eligible items to use this code.` };
  }
  const raw = offer.type === "flat" ? offer.value : Math.floor((eligibleTotal * offer.value) / 100);
  const capped = offer.type === "percent" && offer.maxDiscount !== null ? Math.min(raw, offer.maxDiscount) : raw;
  const discount = Math.max(0, Math.min(capped, eligibleTotal));
  return { ok: true, discount, label: offerSentence(offer) };
}

// The plain-words line the customer sees, for example "20% off, up to ₹200, skincare, on orders above ₹699."
export function offerSentence(offer: Offer): string {
  const what = offer.type === "flat" ? `₹${offer.value} off` : `${offer.value}% off` + (offer.maxDiscount !== null ? `, up to ₹${offer.maxDiscount}` : "");
  const scope = offer.category ? ` on ${offer.category.toLowerCase()}` : "";
  const min = offer.minSubtotal > 0 ? ` on orders above ₹${offer.minSubtotal}` : "";
  return `${what}${scope}${min}.`;
}
