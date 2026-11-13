// Order history rules: which orders a filter shows, the page of orders after a cursor, and which review prompt a delivered
// product shows. Pure (no Firestore, no browser storage), so the server route and the tests use the same maths.

export const ORDER_FILTERS = ["all", "active", "delivered", "cancelled", "returns"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export const ORDER_PAGE_DEFAULT = 20;
export const ORDER_PAGE_MAX = 50;

export function parseOrderFilter(value: unknown): OrderFilter {
  return typeof value === "string" && (ORDER_FILTERS as readonly string[]).includes(value) ? (value as OrderFilter) : "all";
}

// Page size: 20 when absent, clamped to 1..50. Anything that is not a whole number falls back to the default.
export function parsePageLimit(value: unknown): number {
  const n = typeof value === "string" && /^\d{1,3}$/.test(value.trim()) ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isInteger(n)) return ORDER_PAGE_DEFAULT;
  return Math.min(ORDER_PAGE_MAX, Math.max(1, n));
}

// Customer-facing status from the shop status, with any admin decision (saved in admin_orders) applied on top.
export function customerStatus(shopStatus: string, overlay: Record<string, unknown> | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "");
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return shopStatus || "PLACED";
}

export type OrderTone = "active" | "delivered" | "cancelled";

export function toneOfStatus(status: unknown): OrderTone {
  const s = String(status ?? "").toUpperCase();
  if (s === "CANCELLED" || s === "VENDOR_REJECTED") return "cancelled";
  if (s === "DELIVERED") return "delivered";
  return "active";
}

export interface HistoryOrder {
  orderId: string;
  createdAt: number | null;
  status: string;
  hasReturn: boolean;
}

// Whether an order belongs under a filter. "returns" means the customer has at least one return or replacement request.
export function matchesFilter(order: Pick<HistoryOrder, "status" | "hasReturn">, filter: OrderFilter): boolean {
  if (filter === "all") return true;
  if (filter === "returns") return order.hasReturn;
  return toneOfStatus(order.status) === filter;
}

// Newest first. Orders without a date sort last; ties are broken by order id so the order is total and stable.
export function compareNewestFirst(a: Pick<HistoryOrder, "orderId" | "createdAt">, b: Pick<HistoryOrder, "orderId" | "createdAt">): number {
  const at = a.createdAt ?? -Infinity;
  const bt = b.createdAt ?? -Infinity;
  if (at !== bt) return at > bt ? -1 : 1;
  return a.orderId < b.orderId ? 1 : a.orderId > b.orderId ? -1 : 0;
}

export interface OrderCursor {
  createdAt: number | null;
  orderId: string;
}

// The cursor is opaque to the client: base64url of the last order's sort key.
export function encodeOrderCursor(c: OrderCursor): string {
  return Buffer.from(JSON.stringify([c.createdAt, c.orderId]), "utf8").toString("base64url");
}

export function decodeOrderCursor(raw: unknown): OrderCursor | null | "invalid" {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 300 || !/^[A-Za-z0-9_-]+$/.test(raw)) return "invalid";
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) return "invalid";
    const [createdAt, orderId] = parsed;
    if (createdAt !== null && (typeof createdAt !== "number" || !Number.isFinite(createdAt))) return "invalid";
    if (typeof orderId !== "string" || !/^[A-Za-z0-9-]{1,60}$/.test(orderId)) return "invalid";
    return { createdAt, orderId };
  } catch {
    return "invalid";
  }
}

export interface OrderPage<T> {
  items: T[];
  nextCursor: string | null;
}

// One page: filter, sort newest first, skip everything up to the cursor, take `limit`. nextCursor is set only when more
// matching orders follow, so the last page never offers an empty "load more".
export function pageOrders<T extends HistoryOrder>(orders: T[], filter: OrderFilter, limit: number, cursor: OrderCursor | null): OrderPage<T> {
  const matching = orders.filter((o) => matchesFilter(o, filter)).sort(compareNewestFirst);
  // Strictly after the cursor position in newest-first order.
  const remaining = cursor ? matching.filter((o) => compareNewestFirst(o, cursor) > 0) : matching;
  const items = remaining.slice(0, limit);
  const last = items[items.length - 1];
  const more = remaining.length > items.length;
  return { items, nextCursor: more && last ? encodeOrderCursor({ createdAt: last.createdAt, orderId: last.orderId }) : null };
}

// --- Review prompt -------------------------------------------------------------------------------------------------------

export interface ProductReviewState {
  status: "PENDING" | "APPROVED" | "REJECTED";
  rating: number;
  canEdit: boolean;
}

// What a delivered product shows in order history and order detail: the rate prompt when there is no review yet, or the
// customer's own review with its status. Never shown for an order that is not delivered.
export type RatePrompt = { kind: "none" } | { kind: "rate" } | { kind: "reviewed"; review: ProductReviewState };

export function ratePromptFor(delivered: boolean, review: ProductReviewState | null | undefined): RatePrompt {
  if (!delivered) return { kind: "none" };
  if (!review) return { kind: "rate" };
  return { kind: "reviewed", review };
}
