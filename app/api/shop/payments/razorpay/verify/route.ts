import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { verifyPaymentSignature } from "@/lib/shop/razorpay";
import { paymentArrivalTx, refundLatePaymentLive } from "@/lib/shop/pendingOrders";
import { isClosedUnpaid, lateRefundDue, latePaymentPatch } from "@/lib/shop/latePayment";
import { notifyCustomer } from "@/lib/shop/notify";
import { notifyOfferPool } from "@/lib/vendor/notify";

export const dynamic = "force-dynamic";

// Called by the shop after Razorpay Checkout succeeds. The signature proves the payment is genuine; only then is the
// order marked paid and placed. Safe to call twice.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "razorpay-verify-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "razorpay-verify", 60);
  if (userLimited) return userLimited;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const razorpayOrderId = String(body?.razorpay_order_id ?? "");
  const paymentId = String(body?.razorpay_payment_id ?? "");
  const signature = String(body?.razorpay_signature ?? "");
  if (!verifyPaymentSignature(razorpayOrderId, paymentId, signature)) {
    return json({ ok: false, error: "We could not confirm this payment. If money was taken, it will be refunded or the order completed by our team." }, 400);
  }
  const store = db();
  const found = await store.collection("orders").where("razorpayOrderId", "==", razorpayOrderId).limit(1).get();
  const doc = found.docs[0];
  if (!doc || doc.data().userId !== customer.uid) return json({ ok: false, error: "Order not found." }, 404);
  const o = doc.data();
  const now = Date.now();
  // Only an unsettled payment is confirmed here. A repeat after a refund must not flip the order back to PAID.
  // The check, the stock retake and the update happen in one transaction on the order as it is now.
  let confirmed = false;
  let lateRefund = false;
  await store.runTransaction(async (tx) => {
    const snap = await tx.get(doc.ref);
    const cur = snap.data();
    lateRefund = false;
    if (!snap.exists || !cur) return;
    // The order was closed (expired, replaced or cancelled) before this payment: it is not placed; the payment is
    // refunded after the transaction. A repeat (or the webhook first) only retries a refund that is not done.
    if (isClosedUnpaid(cur)) {
      tx.update(doc.ref, latePaymentPatch(cur, { paymentId, now, via: "verify" }));
      lateRefund = true;
      return;
    }
    if (lateRefundDue(cur, paymentId)) {
      lateRefund = true;
      return;
    }
    const settled = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(String(cur.payment?.status ?? ""));
    if (settled) return;
    confirmed = true;
    // Stock and coins given back by a failed attempt or by closing the order as unpaid are taken again.
    const arrival = await paymentArrivalTx(tx, store, doc.id, cur, now);
    arrival.commit();
    tx.update(doc.ref, {
      status: "PLACED",
      "payment.status": "PAID",
      "payment.paymentId": paymentId,
      transactionId: paymentId,
      "payment.transactionId": paymentId,
      ...arrival.patch,
      updatedAt: now,
      events: [...(Array.isArray(cur.events) ? cur.events : []), { at: now, actor: "Payment provider", event: "Payment confirmed" }, ...arrival.notes],
    });
  });
  if (lateRefund) {
    // Never throws: a refund that fails flags the order for the team.
    await refundLatePaymentLive(store, doc.id, paymentId);
    return json({ ok: false, code: "ORDER_CLOSED_REFUNDED", orderId: o.orderId, error: "This order was closed before your payment arrived, so the payment is being refunded to you. Place the order again from your bag." }, 409);
  }
  // A payment on an order closed as unpaid that was already refunded: same answer, nothing more to do.
  if (!confirmed && String((await doc.ref.get()).data()?.latePayment?.paymentId ?? "") === paymentId) {
    return json({ ok: false, code: "ORDER_CLOSED_REFUNDED", orderId: o.orderId, error: "This order was closed before your payment arrived, so the payment is being refunded to you. Place the order again from your bag." }, 409);
  }
  // Customer notification, only when this call confirmed the payment (a repeat call sends nothing).
  if (confirmed) await notifyCustomer(customer.uid, { type: "order_placed", relatedId: doc.id });
  if (confirmed) await notifyOfferPool(store, String(o.orderId ?? ""), String((o.shippingAddress as { pincode?: unknown } | undefined)?.pincode ?? ""));
  return json({ ok: true, orderId: o.orderId, trackingId: o.trackingId, transactionId: paymentId });
}
