// What a partner does to an assigned order, and what the customer may read about it. Every status change, exception
// and cash record is written in the same transaction as an audit entry in riderAudit. The delivery code and the PIN
// are never written to a log or an audit entry.
import "server-only";
import { randomInt } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import { db } from "@/lib/shop/server";
import { RiderError, NOT_FOUND_MESSAGE } from "./errors";
import type { RiderPartner } from "./auth";
import { afterWrongCode, codeLockRemaining, CODE_MAX_WRONG, CODE_LOCK_MS, type CodeState } from "./lockout";
import { hashSecret, verifySecret } from "./pin";
import { openCode, sealCode } from "./codeVault";
import {
  cashVerdict,
  cleanNote,
  codeOpen,
  customerLocation,
  deliveryDetailsView,
  DELIVERED,
  EXCEPTION_REASONS,
  type ExceptionReason,
  locationDoc,
  OUT,
  planDeliveryAction,
  planException,
  planStart,
  type Doc,
  type Rejection,
} from "./rules";
import { ORDER_ID_RE } from "./assignments";

const orders = () => db().collection("orders");
const overlays = () => db().collection("admin_orders");
const locations = () => db().collection("riderLocations");
const codes = () => db().collection("riderDeliveryCodes");
const collections = () => db().collection("riderCollections");
const audit = () => db().collection("riderAudit");

const str = (v: unknown) => (typeof v === "string" ? v : "");

function reject(v: Rejection): never {
  throw new RiderError(v.code, v.status, v.message);
}

function notFound(): never {
  throw new RiderError("NOT_FOUND", 404, NOT_FOUND_MESSAGE);
}

export function checkOrderId(orderId: unknown): string {
  if (typeof orderId !== "string" || !ORDER_ID_RE.test(orderId)) notFound();
  return orderId;
}

async function readOrder(tx: Transaction, orderId: string) {
  const ref = orders().doc(orderId);
  const [snap, overlay] = await tx.getAll(ref, overlays().doc(orderId));
  return {
    ref,
    order: snap.exists ? (snap.data() as Doc) : null,
    overlay: overlay.exists ? (overlay.data() as Doc) : null,
  };
}

const event = (now: number, text: string) => ({ at: now, actor: "Delivery partner", event: text });
const eventsOf = (order: Doc) => (Array.isArray(order.events) ? order.events : []);

function auditEntry(tx: Transaction, entry: { orderId: string; partnerId: string; action: string; from: string; to: string; now: number; extra?: Doc }) {
  tx.set(audit().doc(), { at: entry.now, actor: "rider", orderId: entry.orderId, partnerId: entry.partnerId, action: entry.action, from: entry.from, to: entry.to, ...(entry.extra ?? {}) });
}

/**
 * Start delivery: READY_FOR_PICKUP or PACKED to OUT_FOR_DELIVERY, for the assigned partner only. The first start also
 * creates the customer's delivery code. Starting an order that is already out returns its details without a change.
 * The details (full address, first name, phone when present) are returned here and nowhere earlier.
 */
export async function startDelivery(partner: RiderPartner, orderId: string, now = Date.now()) {
  const store = db();
  const result = await store.runTransaction(async (tx) => {
    const { ref, order, overlay } = await readOrder(tx, orderId);
    if (!order) notFound();
    const verdict = planStart(order, overlay, partner.id);
    if (!verdict.ok) reject(verdict);
    const needsCode = !(order.deliveryCode && typeof (order.deliveryCode as Doc).hash === "string");
    if (!verdict.transition && !needsCode) return { order: deliveryDetailsView(order) };

    const from = str(order.status);
    const patch: Doc = { updatedAt: now, events: [...eventsOf(order)] };
    if (needsCode) {
      const code = String(randomInt(0, 10000)).padStart(4, "0");
      const hash = await hashSecret(code);
      const sealed = await sealCode(code, orderId);
      tx.set(codes().doc(orderId), { ...sealed, createdAt: now });
      patch.deliveryCode = { hash, createdAt: now, wrong: 0, lockedUntil: 0 };
    }
    if (verdict.transition) {
      patch.status = OUT;
      patch.outForDeliveryAt = now;
      (patch.events as unknown[]).push(event(now, "Out for delivery"));
      auditEntry(tx, { orderId, partnerId: partner.id, action: "STATUS_CHANGED", from, to: OUT, now });
    }
    tx.update(ref, patch);
    return { order: deliveryDetailsView({ ...order, ...patch }) };
  });
  return result;
}

export type CodeOutcome = { delivered: true; order: ReturnType<typeof deliveryDetailsView> } | { delivered: false; attemptsLeft: number; lockedMs: number };

/**
 * Completes the delivery with the customer's 4-digit code. Five wrong codes lock the order's code for 30 minutes. The
 * count is saved in the same transaction as the check. On success the order is DELIVERED and the code is removed.
 */
export async function completeWithCode(partner: RiderPartner, orderId: string, code: string, now = Date.now()): Promise<CodeOutcome> {
  const store = db();
  return store.runTransaction(async (tx): Promise<CodeOutcome> => {
    const { ref, order, overlay } = await readOrder(tx, orderId);
    if (!order) notFound();
    const verdict = planDeliveryAction(order, overlay, partner.id);
    if (!verdict.ok) reject(verdict);
    const lock = codeOpen(order, now);
    if (lock.locked) {
      throw new RiderError("CODE_LOCKED", 423, "Too many wrong codes. Wait 30 minutes, or record a delivery exception.", Math.ceil(lock.retryAfterMs / 1000));
    }
    const dc = (order.deliveryCode ?? {}) as Doc;
    if (typeof dc.hash !== "string") throw new RiderError("NO_CODE", 409, "This delivery has no code yet. Ask staff or use the exception path.");

    const correct = await verifySecret(code, dc.hash);
    if (!correct) {
      const prev: CodeState = { wrong: Number(dc.wrong) || 0, lockedUntil: Number(dc.lockedUntil) || 0 };
      const next = afterWrongCode(prev, now);
      tx.update(ref, { "deliveryCode.wrong": next.wrong, "deliveryCode.lockedUntil": next.lockedUntil });
      auditEntry(tx, { orderId, partnerId: partner.id, action: "CODE_WRONG", from: OUT, to: OUT, now, extra: { locked: next.lockedUntil > now } });
      return { delivered: false, attemptsLeft: CODE_MAX_WRONG - next.wrong, lockedMs: next.lockedUntil > now ? CODE_LOCK_MS : 0 };
    }

    const from = str(order.status);
    const patch: Doc = {
      status: DELIVERED,
      deliveredAt: now,
      updatedAt: now,
      "deliveryCode.wrong": 0,
      "deliveryCode.lockedUntil": 0,
      events: [...eventsOf(order), event(now, "Delivered with the customer's code")],
    };
    if (order.deliveryException) {
      // An exception raised earlier is closed by the code, and staff still see that it was raised.
      patch.deliveryException = { ...(order.deliveryException as Doc), status: "CLOSED_BY_CODE", closedAt: now };
    }
    tx.update(ref, patch);
    tx.delete(codes().doc(orderId));
    auditEntry(tx, { orderId, partnerId: partner.id, action: "STATUS_CHANGED", from, to: DELIVERED, now, extra: { method: "CODE" } });
    return { delivered: true, order: deliveryDetailsView({ ...order, ...patch }) };
  }).then(async (outcome) => {
    if (outcome.delivered) await locations().doc(partner.id).delete().catch(() => undefined);
    return outcome;
  });
}

/**
 * The exception path: the customer cannot give the code. The order stays OUT_FOR_DELIVERY with an open exception for
 * staff to review. It is not a delivery. The partner can still complete the order with the code later.
 */
export async function recordException(partner: RiderPartner, orderId: string, reason: unknown, note: unknown, now = Date.now()) {
  if (typeof reason !== "string" || !(EXCEPTION_REASONS as readonly string[]).includes(reason)) {
    throw new RiderError("INVALID_INPUT", 400, "Choose why the delivery cannot be completed with a code.");
  }
  const store = db();
  return store.runTransaction(async (tx) => {
    const { ref, order, overlay } = await readOrder(tx, orderId);
    if (!order) notFound();
    const verdict = planException(order, overlay, partner.id);
    if (!verdict.ok) reject(verdict);
    const exception = {
      status: "OPEN",
      reason: reason as ExceptionReason,
      note: cleanNote(note),
      raisedAt: now,
      raisedByPartnerId: partner.id,
      raisedByName: partner.name,
    };
    tx.update(ref, { deliveryException: exception, updatedAt: now, events: [...eventsOf(order), event(now, "Delivery exception raised, waiting for staff review")] });
    auditEntry(tx, { orderId, partnerId: partner.id, action: "EXCEPTION_RAISED", from: OUT, to: OUT, now, extra: { reason } });
    return { order: deliveryDetailsView({ ...order, deliveryException: exception }) };
  });
}

/** COD: records the cash the partner collected. The amount must equal the order total exactly. Written once. */
export async function recordCash(partner: RiderPartner, orderId: string, amount: unknown, now = Date.now()) {
  const store = db();
  return store.runTransaction(async (tx) => {
    const { ref, order, overlay } = await readOrder(tx, orderId);
    if (!order) notFound();
    const collectionRef = collections().doc(orderId);
    const existing = await tx.get(collectionRef);
    const verdict = cashVerdict(order, overlay, partner.id, amount);
    if (!verdict.ok) reject(verdict);
    if (existing.exists) throw new RiderError("ALREADY_RECORDED", 409, "Cash for this order is already recorded.");
    tx.set(collectionRef, {
      orderId,
      partnerId: partner.id,
      partnerName: partner.name,
      method: "COD",
      amount,
      collectedAt: now,
    });
    tx.update(ref, { cashCollectedAt: now, updatedAt: now, events: [...eventsOf(order), event(now, `Cash collected: Rs ${amount}`)] });
    auditEntry(tx, { orderId, partnerId: partner.id, action: "CASH_COLLECTED", from: OUT, to: OUT, now, extra: { amount } });
    return { cashCollected: true, amount };
  });
}

/** Sends the partner's position. Only while one of their orders is out for delivery. Stored as the last point only. */
export async function shareLocation(partnerId: string, lat: number, lng: number, accuracy: number | null, now = Date.now()): Promise<void> {
  const busy = await orders().where("deliveryPartnerId", "==", partnerId).where("status", "==", OUT).limit(1).get();
  if (busy.empty) throw new RiderError("NOT_ON_DELIVERY", 409, "Location is shared only while a delivery is out for delivery.");
  await locations().doc(partnerId).set(locationDoc(partnerId, lat, lng, accuracy, now));
}

export async function stopLocation(partnerId: string): Promise<void> {
  await locations().doc(partnerId).delete();
}

async function ownOrder(uid: string, orderId: string) {
  const snap = await orders().doc(orderId).get();
  const order = snap.exists ? (snap.data() as Doc) : null;
  if (!order || order.userId !== uid) notFound();
  const overlay = await overlays().doc(orderId).get();
  return { order, overlay: overlay.exists ? (overlay.data() as Doc) : null };
}

/** Customer: the order's status and the rider's last point (rounded, fresh, only while out). Their own orders only. */
export async function customerTracking(uid: string, orderId: string, now = Date.now()) {
  const { order, overlay } = await ownOrder(uid, orderId);
  const partnerId = str(order.deliveryPartnerId);
  const locSnap = partnerId && str(order.status) === OUT ? await locations().doc(partnerId).get() : null;
  const status = str(overlay?.fulfilment).toUpperCase() === "CANCELLED" ? "CANCELLED" : str(order.status) || "PLACED";
  return {
    orderId,
    status,
    location: customerLocation(order, locSnap?.exists ? (locSnap.data() as Doc) : null, now),
    locationEverySeconds: 30,
  };
}

/** Customer: the plain delivery code, only while the order is out for delivery. Otherwise nothing is shown. */
export async function customerCode(uid: string, orderId: string, now = Date.now()) {
  const { order } = await ownOrder(uid, orderId);
  if (str(order.status) !== OUT) return { code: null, reason: str(order.status) === DELIVERED ? "DELIVERED" : "NOT_OUT_FOR_DELIVERY", locked: false };
  const dc = (order.deliveryCode ?? {}) as Doc;
  const lockedMs = codeLockRemaining({ wrong: Number(dc.wrong) || 0, lockedUntil: Number(dc.lockedUntil) || 0 }, now);
  const vault = await codes().doc(orderId).get();
  const code = vault.exists ? await openCode(vault.data(), orderId) : null;
  if (!code) return { code: null, reason: "NOT_AVAILABLE", locked: false };
  return { code, reason: null, locked: lockedMs > 0, lockedMinutes: lockedMs > 0 ? Math.ceil(lockedMs / 60_000) : 0 };
}
