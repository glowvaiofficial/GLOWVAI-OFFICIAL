// Display rules for the order confirming screen and the tracking screen. Pure: no React, no network, no storage, so the
// tests load it directly. Same choices as the native app (src/features/orders/orderProgress.ts).
//
// Everything here reads what the server sent and decides what to show. Nothing is invented: a missing rider, estimate,
// phone number or map point means that part is not shown (or shows as "waiting"), never filled with a sample value.
//
// Sources:
//   GET /api/shop/orders/{id}           { tracking }  status (admin overlay applied), rider {name, phone {display, tel}},
//                                                     address, expected window (lib/shop/tracking.ts trackingView)
//   GET /api/shop/orders/{id}/tracking  { tracking }  stage 1-9, steps, estimateMinutes, delay, map, storePhone
//                                                     (lib/shop/tracking.ts liveTrackingView)

import type { LatLng, LiveTracking, TrackingStage } from '../../../lib/shop/tracking';

// ---------- Confirming screen: three steps ----------

export type StepState = 'done' | 'current' | 'upcoming';

export interface ConfirmStep {
  key: 'payment' | 'store' | 'rider';
  label: string;
  state: StepState;
}

export interface ConfirmingView {
  phase: 'payment' | 'store' | 'rider' | 'assigned' | 'cancelled';
  steps: ConfirmStep[];
  title: string;
  subtitle: string;
  /** True once the store has accepted: the screen moves on to live tracking. */
  readyForTracking: boolean;
}

const CANCELLED_STATUSES = new Set(['CANCELLED', 'VENDOR_REJECTED']);
const ACCEPTED_STATUSES = new Set(['VENDOR_ACCEPTED', 'PACKED', 'READY_FOR_PICKUP', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']);
const RIDER_STATUSES = new Set(['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']);

const norm = (status: unknown): string => (typeof status === 'string' ? status.trim().toUpperCase() : '');

export const isCancelledStatus = (status: unknown): boolean => CANCELLED_STATUSES.has(norm(status));

/**
 * The three steps (payment, store, rider) from the order status:
 *   PAYMENT_PENDING            payment current
 *   PLACED (or unknown)        payment done, store current
 *   accepted, no rider         payment and store done, rider current; ready for tracking
 *   rider named / out / done   all done; ready for tracking
 */
export function confirmingView(input: { status: string | null | undefined; paidOnline: boolean; riderAssigned: boolean }): ConfirmingView {
  const status = norm(input.status) || 'PLACED';
  const firstLabel = input.paidOnline ? 'Payment confirmed' : 'Order placed';
  const steps = (states: [StepState, StepState, StepState], first = firstLabel): ConfirmStep[] => [
    { key: 'payment', label: first, state: states[0] },
    { key: 'store', label: states[1] === 'done' ? 'Store accepted order' : 'Store accepting order', state: states[1] },
    { key: 'rider', label: states[2] === 'done' ? 'Rider assigned' : 'Rider assignment', state: states[2] },
  ];

  if (CANCELLED_STATUSES.has(status)) {
    return {
      phase: 'cancelled',
      steps: steps(['done', 'upcoming', 'upcoming']),
      title: 'Order cancelled',
      subtitle:
        status === 'VENDOR_REJECTED'
          ? 'The store could not take this order. Any online payment is refunded to the way you paid.'
          : 'This order was cancelled and will not be delivered. Any online payment is refunded to the way you paid.',
      readyForTracking: false,
    };
  }
  if (status === 'PAYMENT_PENDING') {
    return {
      phase: 'payment',
      steps: steps(['current', 'upcoming', 'upcoming'], 'Confirming payment'),
      title: 'Confirming your payment',
      subtitle: 'Waiting for your bank to confirm the payment. Your order goes to the store as soon as it does.',
      readyForTracking: false,
    };
  }
  if (input.riderAssigned || RIDER_STATUSES.has(status)) {
    return { phase: 'assigned', steps: steps(['done', 'done', 'done']), title: 'Your order is confirmed', subtitle: 'A rider is assigned. Taking you to live tracking.', readyForTracking: true };
  }
  if (ACCEPTED_STATUSES.has(status)) {
    return { phase: 'rider', steps: steps(['done', 'done', 'current']), title: 'Store accepted your order', subtitle: 'Your products are being reserved. Taking you to live tracking.', readyForTracking: true };
  }
  return {
    phase: 'store',
    steps: steps(['done', 'current', 'upcoming']),
    title: 'Confirming your order',
    subtitle: input.paidOnline ? 'Payment received. Waiting for the nearby store to accept it.' : 'Order received. Waiting for the nearby store to accept it.',
    readyForTracking: false,
  };
}

/**
 * How long the confirming screen waits before it asks the server again (attempt 0 is the first re-check). 10 s, then
 * 15 s, then 30 s; null after ten checks (about five minutes), when the customer refreshes by hand instead.
 */
export function confirmCheckDelay(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= 10) return null;
  if (attempt < 3) return 10_000;
  if (attempt < 6) return 15_000;
  return 30_000;
}

// ---------- Estimate ----------

export interface EtaText {
  value: string;
  unit: string;
  spoken: string;
}

/** The estimate from the server's whole-minute figure. Anything but a whole number from 1 to 180 shows none. */
export function etaText(minutes: number | null | undefined): EtaText | null {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes <= 0 || minutes > 180) return null;
  const unit = minutes === 1 ? 'min' : 'mins';
  return { value: String(minutes), unit, spoken: `Arriving in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` };
}

export type Timeliness = 'on-time' | 'delayed' | null;

/**
 * "Delayed" whenever the store recorded a delay; "On time" only when there is an estimate or a window to be on time
 * against and no delay is recorded. Nothing for a delivered or cancelled order.
 */
export function timeliness(input: { stage: TrackingStage | null; cancelled: boolean; hasDelay: boolean; hasEstimate: boolean }): Timeliness {
  if (input.cancelled || input.stage === null || input.stage === 9) return null;
  if (input.hasDelay) return 'delayed';
  return input.hasEstimate ? 'on-time' : null;
}

/** A short sentence for the status card, by stage. Uses the rider's first name when known. */
export function stageHeadline(stage: TrackingStage | null, riderFirstName: string | null | undefined): string | null {
  const rider = riderFirstName && riderFirstName.trim() ? riderFirstName.trim() : 'Your rider';
  switch (stage) {
    case 1:
      return 'Waiting for the store to accept';
    case 2:
      return 'Your order is confirmed';
    case 3:
      return 'Your items are being picked';
    case 4:
      return 'Your order is getting packed';
    case 5:
      return `${rider} is on the way`;
    case 6:
      return `${rider} is almost there`;
    case 7:
      return `${rider} is nearby`;
    case 8:
      return `${rider} has arrived`;
    case 9:
      return 'Your order was delivered';
    default:
      return null;
  }
}

export const isOutForDeliveryStage = (stage: TrackingStage | null): boolean => stage !== null && stage >= 5 && stage <= 8;

// ---------- Rider ----------

export interface RiderView {
  name: string;
  /** Masked as the server sent it, e.g. "+91 •••••• 3210". */
  phoneDisplay: string | null;
  /** Callable only when the server gave a full Indian mobile. */
  tel: string | null;
  initial: string;
}

const TEL = /^\+91[6-9]\d{9}$/;

/** The rider row, from the order's rider and the live first name. No name means no row ("Assigning a rider" instead). */
export function riderView(
  rider: { name?: unknown; phone?: { display?: unknown; tel?: unknown } | null } | null | undefined,
  liveFirstName: string | null | undefined,
): RiderView | null {
  const fromOrder = rider && typeof rider.name === 'string' ? rider.name.trim().split(/\s+/)[0] ?? '' : '';
  const fromLive = typeof liveFirstName === 'string' ? liveFirstName.trim() : '';
  const name = (fromLive || fromOrder).slice(0, 40);
  if (!name || /[\d@]/.test(name)) return null;
  const phone = rider?.phone ?? null;
  const display = phone && typeof phone.display === 'string' && phone.display.trim() ? phone.display.trim().slice(0, 24) : null;
  const tel = phone && typeof phone.tel === 'string' && TEL.test(phone.tel) ? phone.tel : null;
  return { name, phoneDisplay: display, tel, initial: name.charAt(0).toUpperCase() };
}

// ---------- Map ----------

const point = (v: unknown): LatLng | null => {
  if (!v || typeof v !== 'object') return null;
  const { lat, lng } = v as { lat?: unknown; lng?: unknown };
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

/** True when the live view has at least one point to draw (the customer's drop point or the rider). */
export function hasMapPoint(live: Pick<LiveTracking, 'map'> | null | undefined): boolean {
  const m = live?.map;
  return !!m && m.available === true && (point(m.customer) !== null || point(m.rider) !== null);
}

/**
 * Which layout to use: 'map' (the map large, the status sheet over it) only while the order is out for delivery and there
 * is a point to draw on a map that can load; 'card' (status card and steps) otherwise.
 */
export function trackingLayout(input: { live: Pick<LiveTracking, 'stage' | 'map'> | null; cancelled: boolean; mapSupported: boolean }): 'map' | 'card' {
  if (input.cancelled || !input.mapSupported || !input.live || !hasMapPoint(input.live)) return 'card';
  return isOutForDeliveryStage(input.live.stage) ? 'map' : 'card';
}

// ---------- Stepper ----------

export interface StepperStep {
  stage: TrackingStage;
  title: string;
  state: StepState;
}

const STEPPER_TITLES: Readonly<Record<TrackingStage, string>> = {
  1: 'Order received',
  2: 'Order confirmed',
  3: 'Collecting your products',
  4: 'Packing your order',
  5: 'On the way',
  6: 'Almost there',
  7: 'Arriving',
  8: 'Rider has arrived',
  9: 'Delivered',
};

/**
 * The steps: the server's own list when it sent one (it leaves out stages the order cannot reach), otherwise the five main
 * stages. Stages 6 to 8 show only when the order is at one of them, so the list stays short.
 */
export function stepperSteps(steps: readonly { stage?: unknown }[] | null | undefined, stage: TrackingStage | null): StepperStep[] {
  const stages: TrackingStage[] = [];
  if (Array.isArray(steps)) {
    for (const s of steps.slice(0, 9)) {
      const n = s?.stage;
      if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 9 && !stages.includes(n as TrackingStage)) stages.push(n as TrackingStage);
    }
  }
  const list: TrackingStage[] = stages.length >= 2 ? stages.sort((a, b) => a - b) : [1, 2, 4, 5, 9];
  const shown = list.filter((s) => !(s === 6 || s === 7 || s === 8) || s === stage);
  if (stage !== null && !shown.includes(stage)) {
    shown.push(stage);
    shown.sort((a, b) => a - b);
  }
  return shown.map((s) => ({ stage: s, title: STEPPER_TITLES[s], state: stage === null ? 'upcoming' : s < stage ? 'done' : s === stage ? 'current' : 'upcoming' }));
}

// ---------- Other rows ----------

/** "Add items" makes sense only while the order is still being prepared and not cancelled. */
export const canSuggestAddItems = (stage: TrackingStage | null, cancelled: boolean): boolean => !cancelled && stage !== null && stage <= 4;

/** One line for the delivering-to row. */
export function deliveringToLine(address: { fullAddress?: unknown; city?: unknown; pincode?: unknown } | null | undefined): string | null {
  if (!address) return null;
  const parts = [address.fullAddress, address.city, address.pincode].map((p) => (typeof p === 'string' ? p.trim().slice(0, 200) : '')).filter(Boolean);
  return parts.length ? parts.join(', ').slice(0, 200) : null;
}

/** The admin's live promo banners to show, at most `count`, in the admin's order. Sponsored cards are left out. */
export function pickPromos<T extends { kind: string }>(active: readonly T[] | null | undefined, count: number): T[] {
  if (!Array.isArray(active) || count <= 0) return [];
  return active.filter((s) => s && s.kind !== 'sponsored').slice(0, count);
}
