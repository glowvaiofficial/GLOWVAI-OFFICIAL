// The customer's tracking view of one order: a projection built from an allow-list, so internal fields (vendor ids,
// stock reservations, payment ids, the admin's notes, staff names in events, the tracking number of the admin) never leave
// the server. Pure functions (no server imports).
import { DAY_MS, customerStatus, deliveredAtOf, isCancelled, toMillis, type Doc } from "./orderState";
import { preferenceChangeBlock, parseSubstitutionPreference, SUBSTITUTION_LABELS, type SubstitutionPreference } from "./preferences";
import { DELAY_BANNER_TTL_MS, isDelayReason, type DelayReason } from "./delayRules";

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

// ---------------------------------------------------------------------------------------------------------------------
// Live tracking: the stage the customer sees, derived on the server from the order status, the stage timestamps and the
// rider's last point. Pure: no server imports, so the tests run these exact functions.
// ---------------------------------------------------------------------------------------------------------------------

export type TrackingStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const TRACKING_STAGES: readonly TrackingStage[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface LatLng {
  lat: number;
  lng: number;
}

// Distances from the rider to the customer, in km. Each band includes its upper boundary (see outForDeliveryStage).
export const NEAR_KM = 3;
export const CLOSE_KM = 0.5;
export const DROP_POINT_KM = 0.05;

export const RIDER_FALLBACK_NAME = "Your delivery partner";
export const DELIVERY_CODE_FALLBACK = "Share your delivery OTP to collect your order.";

export const STAGE_COPY: Readonly<Record<TrackingStage, { title: string; subtitle: string }>> = {
  1: { title: "Order received!", subtitle: "We've got your order and are confirming it at our dark store." },
  2: { title: "Order confirmed", subtitle: "Your products are reserved at our dark store." },
  3: { title: "Collecting your products", subtitle: "Our team is picking your items at the dark store." },
  4: { title: "Packing your order", subtitle: "Checking each product and sealing it with care." },
  5: { title: "On the way", subtitle: "{riderFirstName} has picked up your order and is heading to you." },
  6: { title: "Almost there", subtitle: "{riderFirstName} is {distanceKm} km away from your location." },
  7: { title: "Arriving in 2 mins", subtitle: "Keep your phone handy, {riderFirstName} is nearby." },
  8: { title: "{riderFirstName} has arrived", subtitle: "Share OTP {deliveryCode} to collect your order." },
  9: { title: "Delivered!", subtitle: "Enjoy your glow. Not suited to your skin? Request a refund within 7 days." },
};

export const DELAY_COPY: Readonly<Record<DelayReason, { title: string; body: string }>> = {
  TRAFFIC: { title: "Running a little late", body: "Heavy traffic on the way. New arrival time: {newArrivalTime}." },
  STORE_BUSY: { title: "Still packing your order", body: "We're making sure everything is perfect. Thanks for waiting." },
  RAIN: { title: "Delayed due to rain", body: "{riderFirstName} is riding safely to you. New arrival time: {newArrivalTime}." },
};

// Replaces each {name} that has a value. A placeholder with no value stays in the text, so a test can catch it.
export function fillCopy(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole));
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const isLatLng = (v: unknown): v is LatLng => {
  if (!v || typeof v !== "object") return false;
  const { lat, lng } = v as { lat?: unknown; lng?: unknown };
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
};

// Stage for an order that is out for delivery, from the rider's distance to the drop point. No distance (no customer
// coordinates, or no fresh rider point) means the rider is on the way and the distance bands cannot be used: stage 5.
export function outForDeliveryStage(distanceKm: number | null): 5 | 6 | 7 | 8 {
  if (distanceKm === null) return 5;
  if (distanceKm <= DROP_POINT_KM) return 8;
  if (distanceKm <= CLOSE_KM) return 7;
  if (distanceKm <= NEAR_KM) return 6;
  return 5;
}

export interface StageInput {
  // The effective status (admin overlay applied). Unknown values give no stage.
  status: string;
  // Set only when the store begins picking. No writer exists yet, so this is null for every order today.
  pickingAt?: number | null;
  // Set when the rider marks arrival in the rider flow. No writer exists yet.
  riderArrived?: boolean;
  rider: LatLng | null;
  customer: LatLng | null;
}

export interface StageResult {
  cancelled: boolean;
  stage: TrackingStage | null;
  distanceKm: number | null;
}

// The stage the customer sees. Cancelled or store-rejected orders have no stage. READY_FOR_PICKUP (the rider list's
// state before pickup) is shown as packed.
export function deriveStage(input: StageInput): StageResult {
  const status = input.status.toUpperCase();
  if (status === "CANCELLED" || status === "VENDOR_REJECTED") return { cancelled: true, stage: null, distanceKm: null };
  const distanceKm = input.rider && input.customer ? haversineKm(input.rider, input.customer) : null;
  switch (status) {
    case "PLACED":
    case "PAYMENT_PENDING":
      return { cancelled: false, stage: 1, distanceKm };
    case "VENDOR_ACCEPTED":
      return { cancelled: false, stage: input.pickingAt ? 3 : 2, distanceKm };
    case "PACKED":
    case "READY_FOR_PICKUP":
      return { cancelled: false, stage: 4, distanceKm };
    case "OUT_FOR_DELIVERY":
      if (input.riderArrived) return { cancelled: false, stage: 8, distanceKm };
      return { cancelled: false, stage: outForDeliveryStage(distanceKm), distanceKm };
    case "DELIVERED":
      return { cancelled: false, stage: 9, distanceKm };
    default:
      return { cancelled: false, stage: null, distanceKm };
  }
}

// Stages that send an in-app notification, and the notification type each one uses (lib/shop/notifications/templates.ts).
// Stage 1 and 9 already have order_placed and order_delivered; stage 4 has order_packed.
export const STAGE_NOTIFICATION: Readonly<Partial<Record<TrackingStage, string>>> = {
  2: "tracking_confirmed",
  5: "tracking_on_the_way",
  6: "tracking_almost_there",
  7: "tracking_arriving",
  8: "tracking_arrived",
};

// The stage to notify now, or null. Stages only move forward, and each stage is notified at most once per order: the
// highest notified stage is stored on the order (trackingNotifiedStage).
export function stageToNotify(lastNotified: unknown, stage: number | null): TrackingStage | null {
  if (stage === null || !Object.prototype.hasOwnProperty.call(STAGE_NOTIFICATION, stage)) return null;
  const last = typeof lastNotified === "number" && Number.isFinite(lastNotified) ? lastNotified : 0;
  return stage > last ? (stage as TrackingStage) : null;
}

// The delivery code is shown only at stage 8. Any other stage gets {available: false} and no code.
export const codeVisibleAt = (stage: number | null): boolean => stage === 8;

export function deliveryCodeResponse(stage: number | null, code: string | null | undefined, extra: { locked?: boolean; lockedMinutes?: number } = {}) {
  if (!codeVisibleAt(stage) || typeof code !== "string" || !/^\d{4}$/.test(code)) return { available: false as const };
  return {
    available: true as const,
    code,
    locked: Boolean(extra.locked),
    lockedMinutes: extra.locked ? Math.max(0, extra.lockedMinutes ?? 0) : 0,
  };
}

// Times are shown in India time, as the customer reads them: "6:45 pm".
export function formatArrivalTime(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(ms))
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export interface ActiveDelay {
  reason: DelayReason;
  newArrivalAt: number;
  setAt: number;
}

// The delay record, while it is set and not older than the banner window. A malformed record shows no banner.
export function activeDelay(raw: unknown, now: number): ActiveDelay | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (!isDelayReason(d.reason)) return null;
  const newArrivalAt = toMillis(d.newArrivalAt);
  const setAt = toMillis(d.setAt);
  if (newArrivalAt === null || setAt === null) return null;
  if (now - setAt > DELAY_BANNER_TTL_MS) return null;
  return { reason: d.reason, newArrivalAt, setAt };
}

export function delayBanner(delay: { reason: DelayReason; newArrivalAt: number } | null, riderFirstName: string | null) {
  if (!delay) return null;
  const copy = DELAY_COPY[delay.reason];
  const vars = { newArrivalTime: formatArrivalTime(delay.newArrivalAt), riderFirstName: riderFirstName || RIDER_FALLBACK_NAME };
  return { reason: delay.reason, title: copy.title, body: fillCopy(copy.body, vars) };
}

// Stage title and subtitle with the values filled in. Stage 8 shows the code only when the caller has it.
export function stageCopy(stage: TrackingStage, vars: { riderFirstName?: string | null; distanceKm?: number | null; deliveryCode?: string | null }) {
  const rider = vars.riderFirstName || RIDER_FALLBACK_NAME;
  const base = STAGE_COPY[stage];
  const title = fillCopy(base.title, { riderFirstName: rider });
  if (stage === 8 && !vars.deliveryCode) return { title, subtitle: DELIVERY_CODE_FALLBACK };
  const subtitle = fillCopy(base.subtitle, {
    riderFirstName: rider,
    distanceKm: typeof vars.distanceKm === "number" ? vars.distanceKm.toFixed(1) : "",
    deliveryCode: vars.deliveryCode ?? "",
  });
  return { title, subtitle };
}

// "Delivery in about {minutes} min": only for an express slot whose end time is still ahead. Window slots carry no
// minutes figure, so none is shown for them.
export function estimateMinutes(order: Doc, now: number, stage: TrackingStage | null, cancelled: boolean): number | null {
  if (cancelled || stage === null || stage === 9) return null;
  const slot = (order.deliverySlot ?? null) as Doc | null;
  if (!slot || slot.kind !== "express") return null;
  const endsAt = toMillis(slot.endsAt);
  if (endsAt === null) return null;
  const minutes = Math.ceil((endsAt - now) / 60_000);
  return minutes > 0 ? minutes : null;
}

export interface LiveStep {
  stage: TrackingStage;
  title: string;
  state: "done" | "current" | "upcoming";
}

const STEP_TITLES: Readonly<Record<TrackingStage, string>> = {
  1: STAGE_COPY[1].title,
  2: STAGE_COPY[2].title,
  3: STAGE_COPY[3].title,
  4: STAGE_COPY[4].title,
  5: STAGE_COPY[5].title,
  6: STAGE_COPY[6].title,
  7: STAGE_COPY[7].title,
  8: "Rider has arrived",
  9: STAGE_COPY[9].title,
};

export interface LiveTracking {
  orderId: string;
  status: string;
  cancelled: boolean;
  stage: TrackingStage | null;
  title: string;
  subtitle: string;
  steps: LiveStep[];
  riderFirstName: string | null;
  distanceKm: number | null;
  // The delay record while it is set and fresh (3 hours). The screen words the banner with delayBanner().
  delay: { reason: DelayReason; newArrivalAt: number } | null;
  estimateMinutes: number | null;
  hasCustomerLocation: boolean;
  // available: true when there is at least one point to draw (the build key decides whether the map loads at all).
  map: { available: boolean; customer: LatLng | null; rider: LatLng | null; riderUpdatedAt: number | null; store: { name: string; address: string } | null };
  storePhone: string | null;
  updatedAt: number;
}

export interface LiveTrackingInput {
  order: Doc;
  overlay: Doc | null | undefined;
  orderId: string;
  now: number;
  // The rider's last point, already fresh and rounded (lib/rider/rules.ts customerLocation).
  rider: (LatLng & { updatedAt: number }) | null;
  riderFirstName: string | null;
  store: { name: string; address: string } | null;
  storePhone: string | null;
}

// The customer's live view of one order. Steps 3, 6 and 7 are left out when the order cannot reach them (no picking
// record, no customer coordinates), so the stepper never shows a stage the data cannot back.
export function liveTrackingView(input: LiveTrackingInput): LiveTracking {
  const { order, overlay, now } = input;
  const status = customerStatus(order, overlay);
  const customer = isLatLng(order.customerLocation) ? { lat: order.customerLocation.lat, lng: order.customerLocation.lng } : null;
  const pickingAt = toMillis(order.pickingAt);
  const result = deriveStage({
    status,
    pickingAt,
    riderArrived: Boolean(order.riderArrivedAt),
    rider: input.rider ? { lat: input.rider.lat, lng: input.rider.lng } : null,
    customer,
  });
  const { cancelled, stage } = result;
  const riderFirstName = input.riderFirstName || null;

  let title: string;
  let subtitle: string;
  if (cancelled) {
    title = "Order cancelled";
    subtitle = status.toUpperCase() === "VENDOR_REJECTED" ? STATUS_TEXT.VENDOR_REJECTED : STATUS_TEXT.CANCELLED;
  } else if (stage === null) {
    title = "Order in progress";
    subtitle = statusText(status);
  } else {
    const copy = stageCopy(stage, { riderFirstName, distanceKm: result.distanceKm });
    title = copy.title;
    subtitle = copy.subtitle;
  }

  const hasCustomerLocation = customer !== null;
  const shownStages = TRACKING_STAGES.filter((s) => {
    if (s === 3) return pickingAt !== null || stage === 3;
    if (s === 6 || s === 7) return hasCustomerLocation || stage === s;
    return true;
  });
  const steps: LiveStep[] = cancelled
    ? []
    : shownStages.map((s) => ({
        stage: s,
        title: STEP_TITLES[s],
        state: stage === null ? "upcoming" : s < stage ? "done" : s === stage ? "current" : "upcoming",
      }));

  const delayRecord = cancelled || stage === 9 ? null : activeDelay(order.delay, now);
  const delay = delayRecord ? { reason: delayRecord.reason, newArrivalAt: delayRecord.newArrivalAt } : null;
  const showDistance = stage === 6 || stage === 7;

  return {
    orderId: input.orderId,
    status,
    cancelled,
    stage,
    title,
    subtitle,
    steps,
    riderFirstName,
    distanceKm: showDistance && result.distanceKm !== null ? Math.round(result.distanceKm * 10) / 10 : null,
    delay,
    estimateMinutes: estimateMinutes(order, now, stage, cancelled),
    hasCustomerLocation,
    map: {
      available: customer !== null || input.rider !== null || input.store !== null,
      customer,
      rider: input.rider ? { lat: input.rider.lat, lng: input.rider.lng } : null,
      riderUpdatedAt: input.rider?.updatedAt ?? null,
      store: input.store,
    },
    storePhone: input.storePhone,
    updatedAt: now,
  };
}
