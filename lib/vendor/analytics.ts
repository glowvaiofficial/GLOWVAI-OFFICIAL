// Store activity for the vendor app, computed only from this store's own order documents. Pure functions plus a small
// per-instance cache. Every figure is either counted from real orders or null when there is nothing to divide.
//
// Definitions (all times are IST days, windows are the last `days` IST days including today):
// - accepted: orders this store accepted (vendorUid = me) created in the window.
// - declined: orders this store declined (dispatch.declinedBy contains me) created in the window.
// - orders (per day): accepted + declined.
// - averageAcceptSeconds: mean of (vendorAcceptedAt - createdAt) over accepted orders with a valid accept time.
// - fulfilmentRate: fulfilled / settled, where settled = accepted orders that are packed or later, or cancelled, and
//   fulfilled = packed or later (not cancelled). Orders still waiting to be packed are left out, so the rate is not
//   diluted by work in progress. null while nothing has settled.
// - itemsSold: quantities of accepted, not cancelled orders, grouped by product (top 10).
// - orderValue: gross value of items in accepted orders that are now accepted, packed or delivered. It is the order
//   value, not the store's earnings: GlowVai has no payout or fee rules yet.
//
// Bound: the queries read at most ANALYTICS_QUERY_LIMIT documents per source with no ordering, so on a very busy store
// the window can be partial. `bounds.truncated` says so; the app shows it.
import { orderItems, type VendorOrderItem } from "./orders";

type Doc = Record<string, unknown>;

export const ANALYTICS_DAYS = [7, 30] as const;
export type AnalyticsDays = (typeof ANALYTICS_DAYS)[number];
export const ANALYTICS_QUERY_LIMIT = 500;
export const ANALYTICS_CACHE_MS = 5 * 60_000;
export const ORDER_VALUE_LABEL = "Order value — not your earnings";
const TOP_PRODUCTS = 10;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 3_600_000;

const FULFILLED = new Set(["PACKED", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"]);
const VALUE_STATUSES = new Set(["VENDOR_ACCEPTED", "PACKED", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"]);

export const parseDays = (v: string | null): AnalyticsDays | null => {
  if (v === null || v === "") return 7;
  const n = Number(v);
  return (ANALYTICS_DAYS as readonly number[]).includes(n) ? (n as AnalyticsDays) : null;
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** IST day index (days since the epoch in IST). */
export const istDayIndex = (ms: number): number => Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
export const istDateOf = (dayIndex: number): string => new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);

export interface DayRow {
  date: string;
  orders: number;
  accepted: number;
  declined: number;
}

export interface ItemSold {
  productId: string;
  title: string;
  quantity: number;
}

export interface AnalyticsResult {
  days: AnalyticsDays;
  from: number;
  to: number;
  timezone: "Asia/Kolkata";
  ordersPerDay: DayRow[];
  totals: { orders: number; accepted: number; declined: number };
  averageAcceptSeconds: number | null;
  fulfilmentRate: number | null;
  fulfilled: number;
  settled: number;
  itemsSold: ItemSold[];
  orderValue: { amount: number; orderCount: number; label: typeof ORDER_VALUE_LABEL };
  bounds: { perQueryLimit: number; truncated: boolean };
  cachedAt: number;
}

export interface AnalyticsInput {
  /** Order documents with vendorUid == me (at most ANALYTICS_QUERY_LIMIT). */
  mine: Doc[];
  /** Order documents whose dispatch.declinedBy contains me (at most ANALYTICS_QUERY_LIMIT). */
  declined: Doc[];
}

/**
 * The statistics for the last `days` IST days ending at `now`. `mine` and `declined` are the raw documents read by the
 * route; anything outside the window, or from another store, is ignored here.
 */
export function computeAnalytics(input: AnalyticsInput, opts: { now: number; days: AnalyticsDays }): AnalyticsResult {
  const { now, days } = opts;
  const today = istDayIndex(now);
  const firstDay = today - (days - 1);
  const from = firstDay * DAY_MS - IST_OFFSET_MS;
  const inWindow = (ms: number) => ms >= from && ms <= now;

  const rows: DayRow[] = [];
  for (let i = firstDay; i <= today; i++) rows.push({ date: istDateOf(i), orders: 0, accepted: 0, declined: 0 });
  const rowOf = (ms: number): DayRow | undefined => rows[istDayIndex(ms) - firstDay];

  // Accepted: my orders created in the window. Each order counts once.
  const seen = new Set<string>();
  const mine: Doc[] = [];
  for (const o of input.mine) {
    const id = str(o.orderId) || str(o.id);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    const created = num(o.createdAt);
    if (inWindow(created)) mine.push(o);
  }

  // Declined: orders I declined and did not end up accepting.
  const declinedDocs: Doc[] = [];
  for (const o of input.declined) {
    const id = str(o.orderId) || str(o.id);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    const created = num(o.createdAt);
    if (inWindow(created)) declinedDocs.push(o);
  }

  let accepted = 0;
  let declined = 0;
  let acceptSum = 0;
  let acceptCount = 0;
  let fulfilled = 0;
  let settled = 0;
  let orderValue = 0;
  let valueCount = 0;
  const sold = new Map<string, { title: string; quantity: number }>();

  for (const o of mine) {
    const created = num(o.createdAt);
    const status = str(o.status).toUpperCase();
    const cancelled = status === "CANCELLED";
    accepted++;
    const row = rowOf(created);
    if (row) {
      row.accepted++;
      row.orders++;
    }
    const acceptedAt = num(o.vendorAcceptedAt);
    if (acceptedAt > created && created > 0) {
      acceptSum += acceptedAt - created;
      acceptCount++;
    }
    if (FULFILLED.has(status)) {
      fulfilled++;
      settled++;
    } else if (cancelled) {
      settled++;
    }
    if (!cancelled) {
      for (const it of orderItems(o)) addSold(sold, it);
    }
    if (VALUE_STATUSES.has(status)) {
      orderValue += itemsValue(o);
      valueCount++;
    }
  }

  for (const o of declinedDocs) {
    declined++;
    const row = rowOf(num(o.createdAt));
    if (row) {
      row.declined++;
      row.orders++;
    }
  }

  const itemsSold = [...sold.entries()]
    .map(([productId, v]) => ({ productId, title: v.title, quantity: v.quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.title.localeCompare(b.title))
    .slice(0, TOP_PRODUCTS);

  return {
    days,
    from,
    to: now,
    timezone: "Asia/Kolkata",
    ordersPerDay: rows,
    totals: { orders: accepted + declined, accepted, declined },
    averageAcceptSeconds: acceptCount ? Math.round(acceptSum / acceptCount / 1000) : null,
    fulfilmentRate: settled ? Math.round((fulfilled / settled) * 1000) / 1000 : null,
    fulfilled,
    settled,
    itemsSold,
    orderValue: { amount: Math.round(orderValue * 100) / 100, orderCount: valueCount, label: ORDER_VALUE_LABEL },
    bounds: {
      perQueryLimit: ANALYTICS_QUERY_LIMIT,
      truncated: input.mine.length >= ANALYTICS_QUERY_LIMIT || input.declined.length >= ANALYTICS_QUERY_LIMIT,
    },
    cachedAt: now,
  };
}

function addSold(sold: Map<string, { title: string; quantity: number }>, it: VendorOrderItem) {
  if (!it.productId || it.quantity <= 0) return;
  const prev = sold.get(it.productId);
  sold.set(it.productId, { title: prev?.title || it.title || it.productId, quantity: (prev?.quantity ?? 0) + it.quantity });
}

/** Gross value of an order's items (unit price times quantity). Not earnings: no fee or commission is applied. */
export function itemsValue(o: Doc): number {
  return orderItems(o).reduce((s, it) => s + it.unitPrice * it.quantity, 0);
}

// ---- Per-instance cache (5 minutes). Keys are per store and window, so one store never sees another's numbers.

const cache = new Map<string, { at: number; value: AnalyticsResult }>();
const MAX_ENTRIES = 500;

export function cachedAnalytics(key: string, now: number): AnalyticsResult | null {
  const hit = cache.get(key);
  return hit && now - hit.at < ANALYTICS_CACHE_MS ? hit.value : null;
}

export function rememberAnalytics(key: string, value: AnalyticsResult, now: number) {
  cache.delete(key);
  cache.set(key, { at: now, value });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}
