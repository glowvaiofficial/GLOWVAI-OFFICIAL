import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { REORDER_MAX_LINES, catalogViewOf, splitReorder, type ReorderLine } from "@/lib/shop/reorder";

export const dynamic = "force-dynamic";

// "Buy it again" for one of the customer's own orders. Returns the items that can be bought now at today's price and
// stock, and the ones that cannot (with the reason). The browser adds the available ones to the bag. Nothing is written.
const ORDER_ID = /^[A-Za-z0-9_-]{1,60}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "reorder-get", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "reorder", 60);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!ORDER_ID.test(id)) return json({ ok: false, error: "Order not found." }, 404);
  const store = db();
  const orderSnap = await store.collection("orders").doc(id).get();
  const order = orderSnap.data();
  // Another customer's order looks exactly like a missing one.
  if (!orderSnap.exists || !order || order.userId !== customer.uid) return json({ ok: false, error: "Order not found." }, 404);

  const rawItems = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]).slice(0, REORDER_MAX_LINES) : [];
  const lines: ReorderLine[] = rawItems.map((it) => ({ productId: String(it?.productId ?? ""), quantity: Number(it?.quantity) }));
  const previousPrices = new Map<string, number>();
  for (const it of rawItems) {
    const pid = String(it?.productId ?? "");
    const price = Math.round(Number(it?.unitPrice) || 0);
    if (pid && price > 0) previousPrices.set(pid, price);
  }

  const productIds = [...new Set(lines.map((l) => l.productId).filter((pid) => /^[A-Za-z0-9_-]{1,140}$/.test(pid)))];
  const snaps = productIds.length ? await store.getAll(...productIds.map((pid) => store.collection("products").doc(pid))) : [];
  const catalog = new Map(snaps.map((s) => [s.id, catalogViewOf(s.id, s.exists ? (s.data() as Record<string, unknown>) : undefined)]));

  const { available, unavailable } = splitReorder(lines, catalog, previousPrices);
  return json({ ok: true, orderId: id, available, unavailable });
}
