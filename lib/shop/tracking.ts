// The customer's tracking view of one order: a projection built from an allow-list, so internal fields (vendor ids,
// stock reservations, payment ids, the admin's notes, staff names in events, the tracking number of the admin) never leave
// the server. Pure functions (no server imports).
import { DAY_MS, customerStatus, deliveredAtOf, isCancelled, toMillis, type Doc } from "./orderState";
import { preferenceChangeBlock, parseSubstitutionPreference, SUBSTITUTION_LABELS, type SubstitutionPreference } from "./preferences";

export const STATUS_TEXT: Record<string, string> = {
  PLACED: "Waiting for a GlowVai partner store to accept your order.",
  PAYMENT_PENDING: "Waiting for your payment to be confirmed.",
  VENDOR_ACCEPTED: "A partner store accepted your order and is getting it ready.",
  PACKED: "Packed at the store and waiting for pickup.",
  DISPATCHED: "On the way to you.",
  OUT_FOR_DELIVERY: "Out for delivery.",
  DELIVERED: "Delivered.",
  CANCELLED: "This order was cancelled and will not be delivered.",
  VENDOR_REJECTED: "This order was cancelled by the store.",
};

export const statusText = (status: string): string =>
  STATUS_TEXT[status.toUpperCase()] ?? "The GlowVai team is working on this order.";

// Free text from the order that might carry a phone number or an email is masked before it is shown.
export function scrubContact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "•••")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "•••")
    .trim()
    .slice(0, 160);
}

export interface MaskedPhone {
  display: string;
  // Only set when the full Indian mobile number is on the order. Nothing is callable from a partial number.
  tel: string | null;
}

// "+91 •••••• 3210" for a full 10-digit mobile. Anything shorter shows only the last four digits, with no call link.
export function maskPhone(raw: unknown): MaskedPhone | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const national = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (national.length < 4) return null;
  const last4 = national.slice(-4);
  if (national.length === 10 && /^[6-9]\d{9}$/.test(national)) {
    return { display: `+91 •••••• ${last4}`, tel: `+91${national}` };
  }
  return { display: `•••••• ${last4}`, tel: null };
}

export interface TrackingView {
  orderId: string;
  status: string;
  statusText: string;
  placedAt: number | null;
  deliveredAt: number | null;
  timeline: { at: number | null; label: string }[];
  expectedWindow: { from: number; to: number } | null;
  address: { recipientName: string; fullAddress: string; city: string; pincode: string; landmark: string } | null;
  rider: { name: string | null; phone: MaskedPhone | null } | null;
  liveLocation: { available: false; note: string };
  substitutionPreference: { value: SubstitutionPreference | null; label: string | null; canChange: boolean; changeBlockedReason: string | null };
  returnWindowEndsAt: number | null;
}

const LIVE_NOTE = "Live location is not available yet. Your delivery updates appear here as the GlowVai team records them.";

const clean = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

// The order's expected window, only when the order carries one (for example a slot picked at checkout). No estimate is
// made up from anything else.
function windowOf(order: Doc): { from: number; to: number } | null {
  const raw = (order.deliverySlot ?? order.slot) as Doc | undefined;
  if (!raw || typeof raw !== "object") return null;
  const from = toMillis(raw.from ?? raw.start);
  const to = toMillis(raw.to ?? raw.end);
  return from !== null && to !== null && from < to ? { from, to } : null;
}

export function trackingView(order: Doc, overlay: Doc | null | undefined, orderId: string): TrackingView {
  const status = customerStatus(order, overlay);
  const cancelled = isCancelled(order, overlay);
  const deliveredAt = cancelled ? null : deliveredAtOf(order);
  const events = Array.isArray(order.events) ? order.events : [];
  const timeline = events
    .map((raw) => {
      const e = (raw ?? {}) as Doc;
      const label = typeof e.event === "string" ? scrubContact(e.event) : "";
      return label ? { at: toMillis(e.at), label } : null;
    })
    .filter((e): e is { at: number | null; label: string } => e !== null)
    .slice(-50);

  const rawRider = (order.rider ?? null) as Doc | null;
  const riderName = clean(rawRider?.name ?? order.riderName, 60) || null;
  const riderPhone = maskPhone(rawRider?.phone ?? order.riderPhone);
  const rider = riderName || riderPhone ? { name: riderName ? scrubContact(riderName) : null, phone: riderPhone } : null;

  const addr = (order.shippingAddress ?? null) as Doc | null;
  const address = addr
    ? {
        recipientName: clean(addr.recipientName, 80),
        fullAddress: clean(addr.fullAddress, 300),
        city: clean(addr.city, 60),
        pincode: clean(addr.pincode, 6),
        landmark: clean(addr.landmark, 120),
      }
    : null;

  const pref = parseSubstitutionPreference(order.substitutionPreference);
  const change = preferenceChangeBlock(order, overlay);
  const open = !cancelled && !deliveredAt && status.toUpperCase() !== "DELIVERED";

  return {
    orderId,
    status,
    statusText: cancelled ? STATUS_TEXT.CANCELLED : deliveredAt !== null || status.toUpperCase() === "DELIVERED" ? STATUS_TEXT.DELIVERED : statusText(status),
    placedAt: toMillis(order.createdAt),
    deliveredAt,
    timeline,
    expectedWindow: open ? windowOf(order) : null,
    address,
    rider,
    liveLocation: { available: false, note: LIVE_NOTE },
    substitutionPreference: {
      value: pref,
      label: pref ? SUBSTITUTION_LABELS[pref] : null,
      canChange: change.ok,
      changeBlockedReason: change.ok ? null : change.error,
    },
    returnWindowEndsAt: deliveredAt !== null ? deliveredAt + 7 * DAY_MS : null,
  };
}
