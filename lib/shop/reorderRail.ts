// "Buy it again" rail: the products in a signed-in customer's recent orders, priced and stocked now. Pure. The route
// reads the customer's own orders and the products, then calls these. Only orders of the asking customer are used.
import { toneOfStatus } from "./orderHistory";
import type { CatalogView } from "./reorder";

export const REORDER_RAIL_ORDERS = 6;
export const REORDER_RAIL_MAX = 6;
const PRODUCT_ID = /^[A-Za-z0-9_-]{1,140}$/;

export interface RailOrderRow {
  userId: unknown;
  // Customer-facing status (see customerStatus in orderHistory).
  status: string;
  items: { productId?: unknown }[];
}

// Distinct product ids from the customer's orders, newest order first, cancelled orders left out.
export function reorderProductIds(orders: RailOrderRow[], uid: string, max = REORDER_RAIL_MAX): string[] {
  const ids: string[] = [];
  for (const order of orders) {
    if (!uid || order.userId !== uid) continue;
    if (toneOfStatus(order.status) === "cancelled") continue;
    for (const item of order.items ?? []) {
      const pid = typeof item?.productId === "string" ? item.productId : "";
      if (!PRODUCT_ID.test(pid) || ids.includes(pid)) continue;
      ids.push(pid);
      if (ids.length >= max) return ids;
    }
  }
  return ids;
}

export interface ReorderRailItem {
  productId: string;
  name: string;
  price: number;
  image: string;
}

// The rail rows for the ids, in the same order. Products that are gone, unpublished, unpriced or out of stock are left out.
export function reorderRailItems(ids: string[], catalog: Map<string, CatalogView | null | undefined>, max = REORDER_RAIL_MAX): ReorderRailItem[] {
  const out: ReorderRailItem[] = [];
  for (const id of ids) {
    const p = catalog.get(id);
    if (!p || !p.published || !(p.unitPrice > 0)) continue;
    if (p.stock !== null && p.stock <= 0) continue;
    out.push({ productId: p.productId, name: p.name, price: p.unitPrice, image: p.imageUrl });
    if (out.length >= max) break;
  }
  return out;
}
