import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { verifyPaymentSignature } from "@/lib/shop/razorpay";

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
  if (o.payment?.status !== "PAID") {
    await doc.ref.update({
      status: "PLACED",
      "payment.status": "PAID",
      "payment.paymentId": paymentId,
      transactionId: paymentId,
      "payment.transactionId": paymentId,
      updatedAt: now,
      events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "Payment provider", event: "Payment confirmed" }],
    });
  }
  return json({ ok: true, orderId: o.orderId, trackingId: o.trackingId, transactionId: paymentId });
}
