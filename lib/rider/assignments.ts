// Assigning orders to delivery partners. Used by the admin team ("assign partner to order") and by the rider list.
// Every write runs in one transaction with the same rules as lib/rider/rules.ts, and writes an audit entry.
import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { db } from "@/lib/shop/server";
import { RiderError, NOT_FOUND_MESSAGE } from "./errors";
import { assignmentView, canAssign, canUnassign, OPEN_STATUSES, type Doc } from "./rules";

const orders = () => db().collection("orders");
const overlays = () => db().collection("admin_orders");
const partners = () => db().collection("deliveryPartners");

export const ORDER_ID_RE = /^GV-[A-Za-z0-9-]{3,40}$/;

function fail(v: { code: string; status: number; message: string }): never {
  throw new RiderError(v.code, v.status, v.message);
}

/**
 * The partner's open deliveries (ready for pickup, packed or out), oldest first. Each row is the rider-safe view: no
 * customer name, phone or full address. One equality query per status, so no composite index is needed.
 */
export async function listAssignments(partnerId: string) {
  const per = await Promise.all(
    OPEN_STATUSES.map((status) => orders().where("deliveryPartnerId", "==", partnerId).where("status", "==", status).limit(100).get()),
  );
  const docs = per.flatMap((snap) => snap.docs);
  const overlaySnaps = docs.length ? await db().getAll(...docs.map((d) => overlays().doc(d.id))) : [];
  return docs
    .map((d, i) => ({ doc: d, overlay: overlaySnaps[i]?.exists ? (overlaySnaps[i].data() as Doc) : null }))
    .sort((a, b) => Number(a.doc.get("createdAt") ?? 0) - Number(b.doc.get("createdAt") ?? 0))
    .map(({ doc, overlay }) => assignmentView({ ...(doc.data() as Doc), orderId: doc.id }, overlay))
    .filter((row) => !row.cancelled);
}

async function readOrderAndOverlay(tx: Transaction, orderId: string) {
  const [snap, overlay] = await tx.getAll(orders().doc(orderId), overlays().doc(orderId));
  if (!snap.exists) throw new RiderError("NOT_FOUND", 404, NOT_FOUND_MESSAGE);
  return { ref: snap.ref, order: snap.data() as Doc, overlay: overlay.exists ? (overlay.data() as Doc) : null };
}

/**
 * Staff: gives an order to a partner. Only READY_FOR_PICKUP or PACKED orders, one partner per order, and only an active
 * partner. Assigning the same partner again changes nothing.
 */
export async function assignPartner(orderId: string, partnerId: string, actor: string, now = Date.now()): Promise<{ orderId: string; deliveryPartnerId: string }> {
  if (!ORDER_ID_RE.test(orderId) || !partnerId) throw new RiderError("INVALID_INPUT", 400, "Choose an order and a delivery partner.");
  return db().runTransaction(async (tx) => {
    // All reads first, then the writes.
    const { ref, order, overlay } = await readOrderAndOverlay(tx, orderId);
    const partnerSnap = await tx.get(partners().doc(partnerId));
    if (!partnerSnap.exists) throw new RiderError("PARTNER_NOT_FOUND", 404, "That delivery partner does not exist.");
    const partner = partnerSnap.data() as Doc;
    const name = String(partner.name ?? "");
    const verdict = canAssign(order, overlay, { id: partnerId, active: partner.active === true });
    if (!verdict.ok) fail(verdict);
    if (verdict.transition) {
      const from = String(order.status);
      tx.update(ref, {
        deliveryPartnerId: partnerId,
        deliveryPartnerName: name,
        assignedAt: now,
        updatedAt: now,
        events: [...arr(order.events), { at: now, actor: `Staff ${actor}`, event: `Assigned to delivery partner ${name}`.trim() }],
      });
      tx.set(db().collection("riderAudit").doc(), { at: now, action: "ASSIGNED", orderId, partnerId, from, to: from, actor });
    }
    return { orderId, deliveryPartnerId: partnerId };
  });
}

/** Staff: takes an order back from its partner. Refused once the order is out for delivery. */
export async function unassignPartner(orderId: string, actor: string, now = Date.now()): Promise<{ orderId: string }> {
  if (!ORDER_ID_RE.test(orderId)) throw new RiderError("INVALID_INPUT", 400, "Choose an order.");
  return db().runTransaction(async (tx) => {
    const { ref, order, overlay } = await readOrderAndOverlay(tx, orderId);
    const verdict = canUnassign(order, overlay);
    if (!verdict.ok) fail(verdict);
    const previous = String(order.deliveryPartnerId);
    tx.update(ref, {
      deliveryPartnerId: null,
      deliveryPartnerName: null,
      assignedAt: null,
      updatedAt: now,
      events: [...arr(order.events), { at: now, actor: `Staff ${actor}`, event: "Delivery partner removed" }],
    });
    tx.set(db().collection("riderAudit").doc(), { at: now, action: "UNASSIGNED", orderId, partnerId: previous, from: String(order.status), to: String(order.status), actor });
    return { orderId };
  });
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
