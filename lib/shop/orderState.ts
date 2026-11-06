// Order facts the shop reads: the customer-facing status, the delivery date and cancellation. Pure functions with no
// server imports, so the node tests run them directly. Orders are written by the placement route, the vendor app and
// the GlowVai admin; the admin's decision lives in admin_orders/{orderId} (fulfilment) and is applied on top here.

export type Doc = Record<string, unknown>;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const ORDER_ID_PATTERN = /^[A-Za-z0-9-]{6,40}$/;
const DELIVERED_EVENT_TEXT = /^(order\s+)?delivered\b/i;

// Firestore timestamps, epoch milliseconds, or ISO strings. Anything else is null.
export function toMillis(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const ms = (value as { toMillis: () => unknown }).toMillis();
    return typeof ms === "number" && Number.isFinite(ms) ? ms : null;
  }
  return null;
}

// The customer-facing status. The admin's fulfilment decision (saved in admin_orders) wins over the shop status.
export function customerStatus(order: Doc, overlay: Doc | null | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "").toUpperCase();
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return String(order.status ?? "") || "PLACED";
}

export function isCancelled(order: Doc, overlay: Doc | null | undefined): boolean {
  return customerStatus(order, overlay) === "CANCELLED";
}

// When the order was delivered: the deliveredAt field if it is written, otherwise the last events entry whose status is
// DELIVERED (or, for older entries with no status field, whose text starts with "Delivered"). Null when unknown.
export function deliveredAtOf(order: Doc): number | null {
  const direct = toMillis(order.deliveredAt);
  if (direct !== null) return direct;
  const events = Array.isArray(order.events) ? order.events : [];
  let found: number | null = null;
  for (const raw of events) {
    const entry = (raw ?? {}) as Doc;
    const status = typeof entry.status === "string" ? entry.status.toUpperCase() : "";
    const text = typeof entry.event === "string" ? entry.event : "";
    const delivered = status ? status === "DELIVERED" : DELIVERED_EVENT_TEXT.test(text);
    if (!delivered) continue;
    const at = toMillis(entry.at);
    if (at !== null) found = at;
  }
  return found;
}

export function isDelivered(order: Doc, overlay: Doc | null | undefined): boolean {
  return !isCancelled(order, overlay) && (customerStatus(order, overlay) === "DELIVERED" || deliveredAtOf(order) !== null);
}

export interface OrderLineFacts {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

// The order's lines as the shop knows them (never the raw document).
export function orderLines(order: Doc): OrderLineFacts[] {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map((raw) => {
    const it = (raw ?? {}) as Doc;
    return {
      productId: String(it.productId ?? ""),
      title: String(it.productName ?? it.title ?? ""),
      quantity: Math.max(0, Math.floor(Number(it.quantity) || 0)),
      unitPrice: Math.round(Number(it.unitPrice) || 0),
    };
  });
}
