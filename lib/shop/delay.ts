// Delay banners for an order. Only the GlowVai team sets or clears a delay, through the two functions below. Each write
// runs in one transaction with an audit entry (orderAudit), and setDelay is rate limited per staff member.
//
// For the admin team:
//   import { setDelay, clearDelay } from "@/lib/shop/delay";
//   await setDelay(orderId, "TRAFFIC", newArrivalAtMs, { role: "STAFF", uid, name });
//   await clearDelay(orderId, { role: "STAFF", uid, name });
// reason: "TRAFFIC" | "STORE_BUSY" | "RAIN". newArrivalAt: epoch ms, in the future and at most 3 hours ahead.
// Errors are DelayError (with a status and a message the customer-safe copy can use). Nothing customer-identifying is
// written to the audit entry or logged.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { db, tooMany } from "./server";
import { notifyCustomer } from "./notify";
import { isCancelled, type Doc } from "./orderState";
import { validateDelayActor, validateDelayInput, type DelayActor, type DelayReason } from "./delayRules";

export type { DelayActor, DelayReason };

export const DELAY_SET_PER_HOUR = 20;
const ORDER_ID_PATTERN = /^GV-[A-Za-z0-9-]{3,40}$/;
const CLOSED_STATUSES = ["DELIVERED", "VENDOR_REJECTED", "CANCELLED"];

export class DelayError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DelayError";
  }
}

function checkOrderId(orderId: unknown): string {
  if (typeof orderId !== "string" || !ORDER_ID_PATTERN.test(orderId)) throw new DelayError("NOT_FOUND", 404, "We could not find that order.");
  return orderId;
}

function asActor(actor: unknown): DelayActor {
  const v = validateDelayActor(actor);
  if (!v.ok) throw new DelayError("FORBIDDEN", 403, v.error);
  return v.actor;
}

export interface DelayRecord {
  reason: DelayReason;
  newArrivalAt: number;
  setBy: string;
  setAt: number;
}

/**
 * Sets (or replaces) the delay banner on an order. Refused for orders that are closed (delivered, cancelled or rejected).
 * The customer is told once with the in-app "tracking_delayed" notice; the banner itself is read from the order.
 */
export async function setDelay(orderId: string, reason: DelayReason, newArrivalAt: number, actor: DelayActor, now = Date.now()): Promise<DelayRecord> {
  const id = checkOrderId(orderId);
  const by = asActor(actor);
  const input = validateDelayInput(reason, newArrivalAt, now);
  if (!input.ok) throw new DelayError("INVALID_INPUT", 400, input.error);
  if (tooMany(`staff-delay-set:${by.uid}`, DELAY_SET_PER_HOUR, 60 * 60_000)) {
    throw new DelayError("RATE_LIMITED", 429, "Too many delay changes this hour. Wait a while and try again.");
  }

  const store = db();
  const ref = store.collection("orders").doc(id);
  const overlayRef = store.collection("admin_orders").doc(id);
  const record: DelayRecord = { reason: input.reason, newArrivalAt: input.newArrivalAt, setBy: by.uid, setAt: now };
  const userId = await store.runTransaction(async (tx) => {
    const [snap, overlay] = await tx.getAll(ref, overlayRef);
    if (!snap.exists) throw new DelayError("NOT_FOUND", 404, "We could not find that order.");
    const order = snap.data() as Doc;
    const ov = overlay.exists ? (overlay.data() as Doc) : null;
    if (CLOSED_STATUSES.includes(String(order.status)) || isCancelled(order, ov)) {
      throw new DelayError("ORDER_CLOSED", 409, "This order is closed, so no delay can be shown.");
    }
    tx.update(ref, { delay: record, updatedAt: now });
    tx.set(store.collection("orderAudit").doc(), {
      at: now,
      action: "DELAY_SET",
      orderId: id,
      actor: by.uid,
      reason: record.reason,
      newArrivalAt: record.newArrivalAt,
    });
    return typeof order.userId === "string" ? order.userId : null;
  });
  if (userId) await notifyCustomer(userId, { type: "tracking_delayed", relatedId: id });
  return record;
}

/** Removes the delay banner. Nothing to clear is not an error. The removal is audited only when a delay was set. */
export async function clearDelay(orderId: string, actor: DelayActor, now = Date.now()): Promise<{ cleared: boolean }> {
  const id = checkOrderId(orderId);
  const by = asActor(actor);
  const store = db();
  const ref = store.collection("orders").doc(id);
  return store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DelayError("NOT_FOUND", 404, "We could not find that order.");
    const order = snap.data() as Doc;
    if (!order.delay) return { cleared: false };
    tx.update(ref, { delay: FieldValue.delete(), updatedAt: now });
    tx.set(store.collection("orderAudit").doc(), { at: now, action: "DELAY_CLEARED", orderId: id, actor: by.uid });
    return { cleared: true };
  });
}
