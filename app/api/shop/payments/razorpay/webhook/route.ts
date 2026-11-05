import { NextRequest } from "next/server";
import { db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { verifyWebhookSignature } from "@/lib/shop/razorpay";

export const dynamic = "force-dynamic";

// Razorpay server-to-server events. Payment is confirmed here even if the customer closes the browser before verify.
// Signature is checked against the exact raw body with RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "razorpay-webhook-post", 120);
  if (ipLimited) return ipLimited;
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) return json({ ok: false }, 400);
  const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) return json({ ok: true, ignored: true });
  const found = await db().collection("orders").where("razorpayOrderId", "==", entity.order_id).limit(1).get();
  const doc = found.docs[0];
  if (!doc) return json({ ok: true, ignored: true });
  const o = doc.data();
  const now = Date.now();
  if (event.event === "payment.captured" && o.payment?.status !== "PAID") {
    await doc.ref.update({
      status: "PLACED",
      "payment.status": "PAID",
      "payment.paymentId": entity.id ?? null,
      transactionId: entity.id ?? null,
      updatedAt: now,
      events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "Payment provider", event: "Payment confirmed" }],
    });
  } else if (event.event === "payment.failed" && o.payment?.status === "PENDING") {
    await doc.ref.update({
      "payment.status": "FAILED",
      updatedAt: now,
      events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "Payment provider", event: "Payment failed" }],
    });
  }
  return json({ ok: true });
}
