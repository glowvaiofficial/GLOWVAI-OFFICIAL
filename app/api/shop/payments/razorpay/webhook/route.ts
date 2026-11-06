import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { verifyWebhookSignature } from "@/lib/shop/razorpay";
import { applyRefundEvent, refundNotes, type RazorpayRefundEntity } from "@/lib/shop/refunds";
import { releaseStockTx, retakeStockTx } from "@/lib/shop/platformStockTx";
import { notifyCustomer } from "@/lib/shop/notify";
import { notifyOfferPool } from "@/lib/vendor/notify";

export const dynamic = "force-dynamic";

// Payment states an earlier event or verify already settled. A late or repeated payment.captured must not undo them
// (for example, flip a refunded order back to PAID).
const UNSETTLED = new Set(["PENDING", "FAILED"]);

interface RazorpayEvent {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    refund?: { entity?: RazorpayRefundEntity };
  };
}

// Razorpay server-to-server events. Payment is confirmed here even if the customer closes the browser before verify.
// Refund events (refund.processed, refund.failed) update the matching entry in orders/{id}.refunds.
// Signature is checked against the exact raw body with RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "razorpay-webhook-post", 120);
  if (ipLimited) return ipLimited;
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) return json({ ok: false }, 400);
  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return json({ ok: false }, 400);
  }

  if (event.event === "refund.processed" || event.event === "refund.failed") {
    return handleRefund(event.event, event.payload?.refund?.entity);
  }

  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) return json({ ok: true, ignored: true });
  const found = await db().collection("orders").where("razorpayOrderId", "==", entity.order_id).limit(1).get();
  const doc = found.docs[0];
  if (!doc) return json({ ok: true, ignored: true });
  const now = Date.now();
  const store = db();
  // Set inside the transaction when this event changed the order; the customer is told after it commits.
  let notice = null as { uid: string; type: "order_placed" | "payment_failed" } | null;
  let offerPool: { orderId: string; pincode: string } | null = null;
  // The order and its platform stock change together: a failed payment gives the stock back (once), and a payment
  // confirmed after that takes it again. The order is read inside the transaction before anything is written.
  await store.runTransaction(async (tx) => {
    const snap = await tx.get(doc.ref);
    const o = snap.data();
    if (!snap.exists || !o) return;
    const history = Array.isArray(o.events) ? o.events : [];
    if (event.event === "payment.captured" && UNSETTLED.has(String(o.payment?.status ?? "PENDING"))) {
      const retake = await retakeStockTx(tx, store, o.stockReservation, now);
      const notes = retake.shortNote ? [{ at: now, actor: "Stock", event: retake.shortNote }] : [];
      tx.update(doc.ref, {
        status: "PLACED",
        "payment.status": "PAID",
        "payment.paymentId": entity.id ?? null,
        transactionId: entity.id ?? null,
        ...retake.patch,
        updatedAt: now,
        events: [...history, { at: now, actor: "Payment provider", event: "Payment confirmed" }, ...notes],
      });
      notice = { uid: String(o.userId ?? ""), type: "order_placed" };
      offerPool = { orderId: String(o.orderId ?? ""), pincode: String((o.shippingAddress as { pincode?: unknown } | undefined)?.pincode ?? "") };
    } else if (event.event === "payment.failed" && o.payment?.status === "PENDING") {
      const release = await releaseStockTx(tx, store, o.stockReservation, now);
      tx.update(doc.ref, {
        "payment.status": "FAILED",
        ...release.patch,
        updatedAt: now,
        events: [...history, { at: now, actor: "Payment provider", event: "Payment failed" }],
      });
      notice = { uid: String(o.userId ?? ""), type: "payment_failed" };
    }
  });
  // Customer notification after the transaction. notifyCustomer never throws, so the webhook still answers Razorpay.
  if (notice?.uid) await notifyCustomer(notice.uid, { type: notice.type, relatedId: doc.id });
  const pool = offerPool as { orderId: string; pincode: string } | null;
  if (pool) await notifyOfferPool(store, pool.orderId, pool.pincode);
  return json({ ok: true });
}

// Finds the order by the refund's notes.orderId (set when the shop asks for the refund), or else by the payment id
// (a refund made from the Razorpay dashboard), and updates its refund entry in a transaction.
async function handleRefund(eventName: string, entity: RazorpayRefundEntity | undefined) {
  if (!entity?.id) return json({ ok: true, ignored: true });
  const store = db();
  const { orderId } = refundNotes(entity);
  let ref = /^[A-Za-z0-9_-]{1,140}$/.test(orderId) ? store.collection("orders").doc(orderId) : null;
  if (ref && !(await ref.get()).exists) ref = null;
  if (!ref && entity.payment_id) {
    const found = await store.collection("orders").where("payment.paymentId", "==", entity.payment_id).limit(1).get();
    ref = found.docs[0]?.ref ?? null;
  }
  if (!ref) return json({ ok: true, ignored: true });
  const target = ref;
  await store.runTransaction(async (tx) => {
    const snap = await tx.get(target);
    const order = snap.data();
    if (!snap.exists || !order) return;
    // The payment must be the one refunded, so a refund event can never touch another order.
    if (entity.payment_id && order.payment?.paymentId && order.payment.paymentId !== entity.payment_id) return;
    const patch = applyRefundEvent(order, eventName, entity, Date.now());
    if (patch) tx.update(target, patch);
  });
  return json({ ok: true });
}
