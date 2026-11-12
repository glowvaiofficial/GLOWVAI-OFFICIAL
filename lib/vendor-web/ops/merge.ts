// Keeps the vendor's order list in step with the server. The server returns either a full list (full: true) or only the
// orders changed since `since`, plus the ids that are no longer ours or offers (removed). Pure.
import type { OpsOrder, OrdersPage } from "./types";

export type OrderBook = Record<string, OpsOrder>;

/** Overlap subtracted from serverTime so an order written during the previous request is never missed. */
export const SINCE_OVERLAP_MS = 5_000;

/** The `since` value for the next incremental request. */
export function nextSince(page: OrdersPage): number {
  return Math.max(0, page.serverTime - SINCE_OVERLAP_MS);
}

/** Applies one response. A full response replaces the book; an incremental one removes `removed` ids and merges by orderId. */
export function applyOrdersPage(book: OrderBook, page: OrdersPage): OrderBook {
  const next: OrderBook = page.full ? {} : { ...book };
  if (!page.full) for (const id of page.removed ?? []) delete next[id];
  for (const order of [...page.offers, ...page.orders]) next[order.orderId] = order;
  return next;
}

/** Puts one order returned by an accept or pack call into the book (the server's answer is authoritative). */
export function upsertOrder(book: OrderBook, order: OpsOrder): OrderBook {
  return { ...book, [order.orderId]: order };
}

/** Removes an order from the book (after a decline). */
export function dropOrder(book: OrderBook, orderId: string): OrderBook {
  const next = { ...book };
  delete next[orderId];
  return next;
}

export const ORDER_TABS = ["offers", "preparing", "packed", "completed", "cancelled"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const TAB_LABELS: Record<OrderTab, string> = {
  offers: "Offers",
  preparing: "Preparing",
  packed: "Packed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function tabOf(order: OpsOrder): OrderTab {
  if (order.cancelled || order.status === "CANCELLED") return "cancelled";
  if (order.isOffer) return "offers";
  if (order.status === "VENDOR_ACCEPTED") return "preparing";
  if (order.status === "PACKED") return "packed";
  return "completed";
}

/** Orders in one tab, newest first. */
export function ordersInTab(book: OrderBook, tab: OrderTab): OpsOrder[] {
  return Object.values(book)
    .filter((o) => tabOf(o) === tab)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function tabCounts(book: OrderBook): Record<OrderTab, number> {
  const counts: Record<OrderTab, number> = { offers: 0, preparing: 0, packed: 0, completed: 0, cancelled: 0 };
  for (const order of Object.values(book)) counts[tabOf(order)] += 1;
  return counts;
}
