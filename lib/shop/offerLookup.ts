// Server side of offers: finds promo codes and automatic offers, and counts how often each has been used. Used by the
// cart quote and the order, through lib/shop/offerResolve.ts.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { readOffer, type Offer } from "./offers";

const CANCELLED = new Set(["CANCELLED", "VENDOR_REJECTED"]);

// The enabled offer with this code, or null. Only a valid stored offer is returned.
export async function findOfferByCode(store: Firestore, code: string): Promise<Offer | null> {
  const snap = await store.collection("offers").where("code", "==", code).limit(5).get();
  for (const doc of snap.docs) {
    const offer = readOffer(doc.id, doc.data());
    if (offer && !offer.automatic && offer.code === code) return offer;
  }
  return null;
}

// The automatic offers that are switched on. Each is checked again by the rules before it is applied.
export async function findAutomaticOffers(store: Firestore): Promise<Offer[]> {
  const snap = await store.collection("offers").where("automatic", "==", true).limit(50).get();
  const out: Offer[] = [];
  for (const doc of snap.docs) {
    const offer = readOffer(doc.id, doc.data());
    if (offer && offer.automatic) out.push(offer);
  }
  return out;
}

// How often an offer has been used: all orders, and this customer's orders. Cancelled orders do not count. A code offer is
// counted by the code on the order; an automatic offer by its id. The count is read when the order is placed; two
// checkouts at the same instant can both pass a limit of one, which is accepted at this scale and noted in the report.
export async function offerUsage(store: Firestore, offer: Offer, uid: string | null): Promise<{ total: number; forCustomer: number }> {
  const field = offer.automatic ? "offerId" : "couponCode";
  const value = offer.automatic ? offer.id : offer.code;
  const snap = await store.collection("orders").where(field, "==", value).limit(2000).get();
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
