import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/shop/razorpay";
import { placeOrderCore } from "@/lib/shop/orderCore";
import { parseOrderRequest } from "@/lib/shop/orderRequest";

export const dynamic = "force-dynamic";

// Customer-facing status from the shop status, with any admin decision (saved in admin_orders) applied on top.
function customerStatus(shopStatus: string, overlay: Record<string, unknown> | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "");
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return shopStatus || "PLACED";
}

// The signed-in customer's orders, newest first, with any admin decision applied.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "orders-get", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "orders", 60);
  if (userLimited) return userLimited;
  const snap = await db().collection("orders").where("userId", "==", customer.uid).limit(100).get();
  const ids = snap.docs.map((d) => d.id);
  const overlays = new Map<string, Record<string, unknown>>();
  if (ids.length) {
    const refs = ids.map((id) => db().collection("admin_orders").doc(id));
    for (const s of await db().getAll(...refs)) if (s.exists) overlays.set(s.id, s.data() as Record<string, unknown>);
  }
  const orders = snap.docs
    .map((d) => {
      const o = d.data();
      const overlay = overlays.get(d.id);
      return {
        orderId: o.orderId ?? d.id,
        trackingId: o.trackingId ?? null,
        transactionId: o.transactionId ?? o.payment?.transactionId ?? null,
        vendorId: o.vendorId ?? null,
        status: customerStatus(String(o.status ?? ""), overlay),
        cancellationReason: (overlay?.cancellationReason as string | undefined) ?? o.cancellationReason ?? null,
        items: (o.items ?? []).map((it: Record<string, unknown>) => ({
          productId: it.productId,
          title: it.productName ?? it.title,
          brand: it.brand ?? "",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          imageUrl: it.imageUrl ?? "",
          variantId: it.variantId ?? null,
          variantLabel: it.variantLabel ?? null,
        })),
        pricing: o.pricing ?? null,
        deliverySlot: o.deliverySlot ?? null,
        payment: { method: o.payment?.method ?? "COD", status: o.payment?.status ?? "PENDING" },
        shippingAddress: o.shippingAddress ?? null,
        createdAt: o.createdAt ?? null,
        updatedAt: o.updatedAt ?? null,
      };
    })
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
  return json({ ok: true, orders });
}

// Places an order. The checks, pricing and transaction live in lib/shop/orderCore.ts (shared with the subscription cron).
// Only cash on delivery is offered until online payment is connected; online orders need RAZORPAY_KEY_ID and secret.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "orders-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to place your order." }, 401);
  const userLimited = limitByUser(customer.uid, "orders", 60);
  if (userLimited) return userLimited;
  if (tooMany(`order:${customer.uid}`, 10, 60 * 60 * 1000)) return json({ ok: false, error: "Too many orders in a short time. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const parsed = parseOrderRequest(body, { onlineAvailable: razorpayConfigured() });
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);

  const online = parsed.value.paymentMethod === "ONLINE";
  const result = await placeOrderCore(db(), {
    uid: customer.uid,
    ...parsed.value,
    startPayment: online ? (amount, orderId) => createRazorpayOrder(amount, orderId) : undefined,
  });
  if (!result.ok) return json({ ok: false, error: result.error }, result.status);
  return json(result.body);
}
