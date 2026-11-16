// Payout ledger for one store, computed from records that already exist. Nothing here writes anything.
// - Orders: this store's orders (vendorUid = me) with status DELIVERED. Earnings are counted only from delivered orders.
// - Commission: the rate the admin saved in admin_config/financeSettings (commissionPercent). While no rate is saved the
//   commission, net earnings and balance are null: the portal says so rather than guessing.
// - Settlements: admin_settlements documents for this store (vendorId = "VAPP-<uid>"). Only RELEASED ones were paid out
//   (the admin marks a settlement RELEASED when a payout batch completes). PENDING and ON_HOLD are shown but not counted as paid.
// - Balance due: net earnings minus paid settlements, never below zero.
import { itemsValue } from "./analytics";

type Doc = Record<string, unknown>;

export const LEDGER_ORDER_LIMIT = 500;
export const LEDGER_SETTLEMENT_LIMIT = 100;
export const LEDGER_RECENT_ORDERS = 25;
export const LEDGER_CACHE_MS = 2 * 60_000;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const money = (n: number) => Math.round(n * 100) / 100;

/** A valid commission percent (0 to 100), or null when the admin has not saved one. */
export function commissionRate(config: Doc | null | undefined): number | null {
  const value = config && typeof config.value === "object" && config.value ? (config.value as Doc) : config;
  const p = num(value?.commissionPercent);
  return p !== null && p >= 0 && p <= 100 ? p : null;
}

export interface LedgerOrder {
  orderId: string;
  deliveredAt: number;
  gross: number;
  commission: number | null;
  net: number | null;
}

export interface LedgerSettlement {
  id: string;
  period: string;
  gross: number;
  commission: number;
  netPayout: number;
  status: "PENDING" | "ON_HOLD" | "RELEASED";
}

export interface LedgerSummary {
  deliveredOrders: number;
  gross: number;
  commissionPercent: number | null;
  commission: number | null;
  netEarnings: number | null;
  settled: number;
  pending: number;
  balanceDue: number | null;
}

export interface LedgerResult {
  summary: LedgerSummary;
  recentOrders: LedgerOrder[];
  settlements: LedgerSettlement[];
  bounds: { orderLimit: number; settlementLimit: number; truncated: boolean };
  cachedAt: number;
}

export function toSettlement(d: Doc): LedgerSettlement | null {
  const id = str(d.id);
  const status = str(d.status).toUpperCase();
  const netPayout = num(d.netPayout);
  if (!id || netPayout === null) return null;
  if (status !== "PENDING" && status !== "ON_HOLD" && status !== "RELEASED") return null;
  return { id, period: str(d.period), gross: num(d.gross) ?? 0, commission: num(d.commission) ?? 0, netPayout: money(netPayout), status };
}

export function computeLedger(input: { orders: Doc[]; settlements: Doc[]; config: Doc | null }, now: number): LedgerResult {
  const percent = commissionRate(input.config);
  const seen = new Set<string>();
  const delivered: LedgerOrder[] = [];
  for (const o of input.orders) {
    const orderId = str(o.orderId) || str(o.id);
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);
    if (str(o.status).toUpperCase() !== "DELIVERED") continue;
    const gross = money(itemsValue(o));
    const commission = percent === null ? null : money((gross * percent) / 100);
    delivered.push({
      orderId,
      deliveredAt: num(o.deliveredAt) ?? num(o.updatedAt) ?? num(o.createdAt) ?? 0,
      gross,
      commission,
      net: commission === null ? null : money(gross - commission),
    });
  }
  delivered.sort((a, b) => b.deliveredAt - a.deliveredAt || a.orderId.localeCompare(b.orderId));

  const settlements = input.settlements.map(toSettlement).filter((s): s is LedgerSettlement => s !== null);
  settlements.sort((a, b) => b.id.localeCompare(a.id));
  const settled = money(settlements.filter((s) => s.status === "RELEASED").reduce((s, x) => s + x.netPayout, 0));
  const pending = money(settlements.filter((s) => s.status !== "RELEASED").reduce((s, x) => s + x.netPayout, 0));

  const gross = money(delivered.reduce((s, o) => s + o.gross, 0));
  const commission = percent === null ? null : money(delivered.reduce((s, o) => s + (o.commission ?? 0), 0));
  const netEarnings = commission === null ? null : money(gross - commission);
  const balanceDue = netEarnings === null ? null : money(Math.max(0, netEarnings - settled));

  return {
    summary: { deliveredOrders: delivered.length, gross, commissionPercent: percent, commission, netEarnings, settled, pending, balanceDue },
    recentOrders: delivered.slice(0, LEDGER_RECENT_ORDERS),
    settlements,
    bounds: {
      orderLimit: LEDGER_ORDER_LIMIT,
      settlementLimit: LEDGER_SETTLEMENT_LIMIT,
      truncated: input.orders.length >= LEDGER_ORDER_LIMIT || input.settlements.length >= LEDGER_SETTLEMENT_LIMIT,
    },
    cachedAt: now,
  };
}

const cache = new Map<string, { at: number; value: LedgerResult }>();
const MAX_ENTRIES = 500;

export function cachedLedger(key: string, now: number): LedgerResult | null {
  const hit = cache.get(key);
  return hit && now - hit.at < LEDGER_CACHE_MS ? hit.value : null;
}

export function rememberLedger(key: string, value: LedgerResult, now: number) {
  cache.delete(key);
  cache.set(key, { at: now, value });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}
