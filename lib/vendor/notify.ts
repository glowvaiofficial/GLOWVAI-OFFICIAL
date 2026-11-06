// Tells vendors that a new order is waiting for them (an offer). Server only. Never throws: a failed push must never
// fail the checkout or the payment webhook that called it. Failures are logged with a short code only.
//
// HOW TO USE (shop routes):
//   await notifyOfferPool(db(), orderId, pincode);   // after an order becomes PLACED (COD, or payment confirmed)
//   await notifyVendorOffer(vendorUid, orderId);     // one store
//
// Sending needs the Admin SDK credentials (FIREBASE_SERVICE_ACCOUNT_JSON). Without them nothing is sent and nothing fails.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { db, messaging } from "@/lib/shop/server";
import { OFFER_FRESHNESS_MS } from "./orders";
import { PUSH_TOKEN_MAX, notifyVendorOfferWith, type OfferPushDeps, type OfferPushResult } from "./push";
import { loadVendor, operatorOf } from "./store";

/** Most stores one order is offered to by push at once (the offer pool is capped the same way on the app side). */
export const OFFER_POOL_PUSH_LIMIT = 10;

const INVALID_TOKEN_CODES = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered"]);

const liveDeps: OfferPushDeps = {
  async loadTokens(vendorUid) {
    const snap = await db().collection("vendors").doc(vendorUid).collection("pushTokens").limit(PUSH_TOKEN_MAX).get();
    return snap.docs.map((d) => ({ id: d.id, token: String(d.get("token") ?? "") }));
  },
  async send(tokens, message) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return { successCount: 0, failureCount: 0, invalidIndexes: [] };
    const res = await messaging().sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
    });
    const invalidIndexes: number[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code)) invalidIndexes.push(i);
    });
    return { successCount: res.successCount, failureCount: res.failureCount, invalidIndexes };
  },
  async removeTokens(vendorUid, ids) {
    const store = db();
    const batch = store.batch();
    for (const id of ids) batch.delete(store.collection("vendors").doc(vendorUid).collection("pushTokens").doc(id));
    await batch.commit();
  },
  log(message, code) {
    console.error(`[vendor-notify] ${message}`, code ?? "");
  },
};

/** Pushes "new order" to every registered device of one store. Never throws. */
export async function notifyVendorOffer(vendorUid: string, orderId: string): Promise<OfferPushResult> {
  try {
    return await notifyVendorOfferWith(liveDeps, vendorUid, orderId);
  } catch {
    return { sent: 0, failed: 0, removed: 0 };
  }
}

/**
 * Pushes an offer to the stores that can take an order to this pincode right now: approved, active, online and seen in
 * the last few minutes. At most OFFER_POOL_PUSH_LIMIT stores. Never throws.
 */
export async function notifyOfferPool(store: Firestore, orderId: string, pincode: string): Promise<void> {
  try {
    if (!pincode || !orderId) return;
    const apps = await store
      .collection("vendorApplications")
      .where("servicePincodes", "array-contains", pincode)
      .limit(OFFER_POOL_PUSH_LIMIT)
      .get();
    const now = Date.now();
    const uids: string[] = [];
    for (const doc of apps.docs) {
      if (!doc.id.startsWith("VAPP-")) continue;
      const uid = doc.id.slice(5);
      const vendor = operatorOf(await loadVendor(uid));
      const fresh = vendor.lastSeenAt !== null && now - vendor.lastSeenAt <= OFFER_FRESHNESS_MS;
      if (vendor.canOperate && vendor.isOnline && fresh) uids.push(uid);
    }
    await Promise.all(uids.map((uid) => notifyVendorOffer(uid, orderId)));
  } catch (err) {
    console.error("[vendor-notify] offer pool failed", (err as { code?: string })?.code ?? "UNKNOWN");
  }
}
