// Server side of offers: finds a promo code and counts how often it has been used. Used by the order and the cart quote.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { readOffer, type Offer } from "./offers";

const CANCELLED = new Set(["CANCELLED", "VENDOR_REJECTED"]);

// The enabled offer with this code, or null. Only a valid stored offer is returned.
export async function findOfferByCode(store: Firestore, code: string): Promise<Offer | null> {
  const snap = await store.collection("offers").where("code", "==", code).limit(5).get();
  for (const doc of snap.docs) {
    const offer = readOffer(doc.id, doc.data());
    if (offer && offer.code === code) return offer;
  }
  return null;
}

// How often the code has been used: all orders, and this customer's orders. Cancelled orders do not count.
// The count is read when the order is placed; two checkouts at the same instant can both pass a limit of one, which is
// accepted at this scale and noted in the report.
export async function offerUsage(store: Firestore, code: string, uid: string | null): Promise<{ total: number; forCustomer: number }> {
  const snap = await store.collection("orders").where("couponCode", "==", code).limit(2000).get();
  let total = 0;
  let forCustomer = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as { status?: unknown; userId?: unknown };
    if (CANCELLED.has(String(d.status ?? ""))) continue;
    total += 1;
    if (uid && d.userId === uid) forCustomer += 1;
  }
  return { total, forCustomer };
}
