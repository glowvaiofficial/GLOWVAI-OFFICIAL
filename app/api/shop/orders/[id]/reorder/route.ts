import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { REORDER_MAX_LINES, catalogViewOf, splitReorder, type CatalogView, type ReorderLine } from "@/lib/shop/reorder";
import { lineKeyOf, readProductVariants, resolveVariant } from "@/lib/shop/variants";

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
  const lines: ReorderLine[] = rawItems.map((it) => ({
    productId: String(it?.productId ?? ""),
    variantId: typeof it?.variantId === "string" && it.variantId ? it.variantId : null,
    quantity: Number(it?.quantity),
  }));
  const previousPrices = new Map<string, number>();
  for (const it of rawItems) {
    const pid = String(it?.productId ?? "");
    const price = Math.round(Number(it?.unitPrice) || 0);
    if (pid && price > 0) previousPrices.set(lineKeyOf(pid, typeof it?.variantId === "string" ? it.variantId : null), price);
  }

  const productIds = [...new Set(lines.map((l) => l.productId).filter((pid) => /^[A-Za-z0-9_-]{1,140}$/.test(pid)))];
  const snaps = productIds.length ? await store.getAll(...productIds.map((pid) => store.collection("products").doc(pid))) : [];
  // One catalogue row per order line. A line of a product with variants is priced and stocked from its own variant; a
  // line whose variant no longer exists (or a product that lost its variants) is not available.
  const catalog = new Map<string, CatalogView | null>();
  for (const snap of snaps) {
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
    const base = catalogViewOf(snap.id, data);
    const stored = readProductVariants(data?.variants);
    for (const line of lines.filter((l) => l.productId === snap.id)) {
      const key = lineKeyOf(line.productId, line.variantId);
      if (!base || !stored.ok) {
        catalog.set(key, null);
      } else if (!stored.variants) {
        catalog.set(key, line.variantId ? null : base);
      } else {
        const pick = resolveVariant(stored.variants, line.variantId);
        if (!pick.ok || !pick.variant) {
          catalog.set(key, null);
        } else {
          const v = pick.variant;
          catalog.set(key, { ...base, published: base.published && v.isAvailable, unitPrice: v.price, originalPrice: v.mrp, stock: v.stock, variantId: v.id, variantLabel: v.label });
        }
      }
    }
  }

  const { available, unavailable } = splitReorder(lines, catalog, previousPrices);
  return json({ ok: true, orderId: id, available, unavailable });
}
