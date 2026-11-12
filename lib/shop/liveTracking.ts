// The customer's live tracking for one of their own orders, and the delivery code at stage 8. Reads only: the order, the
// admin overlay, the rider's last point, the assigned partner's first name and the store's public address. Stage
// notifications are sent once per stage, claimed in a transaction on the order.
import "server-only";
import { db } from "./server";
import { notifyCustomer } from "./notify";
import { customerStatus, type Doc } from "./orderState";
import { liveTrackingView, codeVisibleAt, deliveryCodeResponse, stageToNotify, STAGE_NOTIFICATION, type LiveTracking } from "./tracking";
import { customerLocation, OUT, type Doc as RiderDoc } from "../rider/rules";
import { customerCode } from "../rider/deliveries";
import { ORDER_ID_RE } from "../rider/assignments";
import { siteConfig } from "@/config/site";

export class TrackingNotFound extends Error {
  constructor() {
    super("We could not find that order.");
    this.name = "TrackingNotFound";
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

// The first name only, and only when it looks like a name (no digits, no @).
export function partnerFirstName(name: unknown): string | null {
  const first = str(name).trim().split(/\s+/)[0] ?? "";
  if (!first || first.length > 40 || /[\d@]/.test(first)) return null;
  return first;
}

async function ownOrder(uid: string, orderId: string) {
  if (!ORDER_ID_RE.test(orderId)) throw new TrackingNotFound();
  const store = db();
  const snap = await store.collection("orders").doc(orderId).get();
  const order = snap.exists ? (snap.data() as Doc) : null;
  if (!order || order.userId !== uid) throw new TrackingNotFound();
  const overlay = await store.collection("admin_orders").doc(orderId).get();
  return { order, overlay: overlay.exists ? (overlay.data() as Doc) : null };
}

/** The customer's view of one order: stage, copy, banner, estimate, map points. Their own orders only. */
export async function customerLiveTracking(uid: string, orderId: string, now = Date.now()): Promise<LiveTracking> {
  const { order, overlay } = await ownOrder(uid, orderId);
  const store = db();
  const partnerId = str(order.deliveryPartnerId);
  const status = customerStatus(order, overlay);

  const [locSnap, partnerSnap, vendorSnap] = await Promise.all([
    partnerId && status === OUT ? store.collection("riderLocations").doc(partnerId).get() : Promise.resolve(null),
    partnerId ? store.collection("deliveryPartners").doc(partnerId).get() : Promise.resolve(null),
    str(order.vendorId) ? store.collection("vendorApplications").doc(str(order.vendorId)).get() : Promise.resolve(null),
  ]);

  // The rider's point: fresh, rounded, and only while the order is out. customerLocation applies those rules.
  const point = customerLocation(order as RiderDoc, locSnap?.exists ? (locSnap.data() as RiderDoc) : null, now);
  const riderFirstName = partnerSnap?.exists ? partnerFirstName((partnerSnap.data() as Doc).name) : null;

  const vendor = vendorSnap?.exists ? (vendorSnap.data() as Doc) : null;
  const storeInfo = vendor
    ? {
        name: str(vendor.storeName).trim().slice(0, 80) || "Dark store",
        address: [vendor.streetAddress, vendor.city, vendor.pincode].map((p) => str(p).trim()).filter(Boolean).join(", ").slice(0, 200),
      }
    : null;

  return liveTrackingView({
    order,
    overlay,
    orderId,
    now,
    rider: point ? { lat: point.lat, lng: point.lng, updatedAt: point.updatedAt } : null,
    riderFirstName,
    store: storeInfo && storeInfo.address ? storeInfo : null,
    storePhone: siteConfig.storePhone || null,
  });
}

/**
 * Sends the customer the in-app notice for their current stage, once. The highest stage notified is stored on the order
 * in the same transaction that decides, so two reads at once cannot both send it. Never throws.
 */
export async function notifyStageOnce(uid: string, orderId: string, stage: number | null): Promise<boolean> {
  // Only the stages that notify need a transaction: most polls return straight away.
  if (stage === null || !Object.prototype.hasOwnProperty.call(STAGE_NOTIFICATION, stage)) return false;
  const ref = db().collection("orders").doc(orderId);
  let toSend: number | null = null;
  try {
    toSend = await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const last = Number((snap.data() as Doc).trackingNotifiedStage) || 0;
      const next = stageToNotify(last, stage);
      if (next === null) return null;
      tx.update(ref, { trackingNotifiedStage: next });
      return next;
    });
  } catch {
    return false;
  }
  if (toSend === null) return false;
  const type = STAGE_NOTIFICATION[toSend as keyof typeof STAGE_NOTIFICATION];
  if (!type) return false;
  await notifyCustomer(uid, { type, relatedId: orderId });
  return true;
}

/** The delivery code: only at stage 8 and only on the customer's own order. Anything else is {available: false}. */
export async function customerDeliveryCode(uid: string, orderId: string, now = Date.now()) {
  const view = await customerLiveTracking(uid, orderId, now);
  if (!codeVisibleAt(view.stage)) return deliveryCodeResponse(view.stage, null);
  const result = await customerCode(uid, orderId, now);
  return deliveryCodeResponse(view.stage, result.code ?? null, {
    locked: "locked" in result ? Boolean(result.locked) : false,
    lockedMinutes: "lockedMinutes" in result ? Number(result.lockedMinutes) || 0 : 0,
  });
}
