// The privacy centre's reads: the data summary (contact details masked) and the export of the customer's own records.
import "server-only";
import { db } from "../server";
import { buildExport, maskEmail, maskPhone, type ExportInput } from "./rules";

type Doc = Record<string, unknown>;

// Caps keep one export bounded. A customer with more records than this gets the first ones and a note in the summary.
const CAP = { orders: 200, reviews: 200, subscriptions: 100, tickets: 50, addresses: 5, wishlist: 200, activity: 100 };

export async function gatherExport(uid: string, now: number): Promise<Doc> {
  const store = db();
  const userRef = store.collection("users").doc(uid);
  const [profileSnap, addressSnap, orderSnap, reviewSnap, wishSnap, subSnap, activitySnap, ticketSnap] = await Promise.all([
    userRef.get(),
    userRef.collection("addresses").limit(CAP.addresses).get(),
    store.collection("orders").where("userId", "==", uid).limit(CAP.orders).get(),
    store.collection("reviews").where("createdBy", "==", uid).limit(CAP.reviews).get(),
    userRef.collection("wishlist").limit(CAP.wishlist).get(),
    store.collection("subscriptions").where("uid", "==", uid).limit(CAP.subscriptions).get(),
    userRef.collection("activity").limit(CAP.activity).get(),
    store.collection("admin_tickets").where("customerId", "==", uid).limit(CAP.tickets).get(),
  ]);
  const input: ExportInput = {
    uid,
    now,
    profile: profileSnap.exists ? (profileSnap.data() as Doc) : null,
    addresses: addressSnap.docs.map((d) => d.data() as Doc),
    orders: orderSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Doc) })),
    reviews: reviewSnap.docs.map((d) => d.data() as Doc),
    wishlist: wishSnap.docs.map((d) => d.id),
    subscriptions: subSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Doc) })),
    activity: activitySnap.docs.map((d) => d.data() as Doc),
    tickets: ticketSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Doc) })),
  };
  return buildExport(input);
}

// What the account holds, as counts, with contact details masked. Counts are exact up to the cap shown.
export async function accountSummary(uid: string): Promise<Doc> {
  const store = db();
  const userRef = store.collection("users").doc(uid);
  const [profileSnap, addresses, orders, reviews, wishlist, subs, tickets, devices] = await Promise.all([
    userRef.get(),
    userRef.collection("addresses").count().get(),
    store.collection("orders").where("userId", "==", uid).count().get(),
    store.collection("reviews").where("createdBy", "==", uid).count().get(),
    userRef.collection("wishlist").count().get(),
    store.collection("subscriptions").where("uid", "==", uid).count().get(),
    store.collection("admin_tickets").where("customerId", "==", uid).count().get(),
    userRef.collection("devices").count().get(),
  ]);
  const p = (profileSnap.data() ?? {}) as Doc;
  return {
    profile: {
      name: typeof p.name === "string" && p.name ? p.name.trim().split(/\s+/)[0] : "",
      phone: maskPhone(p.phone),
      email: maskEmail(p.email),
      hasAddress: Boolean(p.address),
    },
    counts: {
      addresses: addresses.data().count,
      orders: orders.data().count,
      reviews: reviews.data().count,
      wishlist: wishlist.data().count,
      subscriptions: subs.data().count,
      supportTickets: tickets.data().count,
      devices: devices.data().count,
    },
    consents: {
      marketing: p.consents && typeof p.consents === "object" && (p.consents as Doc).marketing === true,
      analytics: p.consents && typeof p.consents === "object" && (p.consents as Doc).analytics === true,
    },
  };
}
