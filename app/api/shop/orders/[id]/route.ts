import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { ORDER_ID_PATTERN, type Doc } from "@/lib/shop/orderState";
import { trackingView } from "@/lib/shop/tracking";
import { customerReturnView, RETURN_COLLECTION } from "@/lib/shop/returns";

export const dynamic = "force-dynamic";

// The tracking page of one order: timeline, expected window (only when the order carries one), the customer's own
// address, the rider (only when the order carries one), the store-side status text, the substitution preference and the
// return requests on this order. Built by lib/shop/tracking.ts from an allow-list.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "order-track", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "order-track", 120);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!ORDER_ID_PATTERN.test(id)) return json({ ok: false, error: "Order not found." }, 404);
  const store = db();
  const [orderSnap, overlaySnap] = await store.getAll(store.collection("orders").doc(id), store.collection("admin_orders").doc(id));
  const order = orderSnap.data() as Doc | undefined;
  if (!orderSnap.exists || !order || order.userId !== customer.uid) return json({ ok: false, error: "Order not found." }, 404);
  const overlay = overlaySnap.exists ? (overlaySnap.data() as Doc) : null;

  const returnsSnap = await store.collection(RETURN_COLLECTION).where("uid", "==", customer.uid).where("orderId", "==", id).limit(20).get();
  const returns = returnsSnap.docs.map((d) => {
    const view = customerReturnView(d.data() as Doc, d.id);
    return { returnId: view.returnId, type: view.type, status: view.status, requestedAt: view.createdAt, items: view.items.map((i) => ({ productId: i.productId, title: i.title, quantity: i.quantity })) };
  });

  return json({ ok: true, tracking: { ...trackingView(order, overlay, id), returns } });
}
