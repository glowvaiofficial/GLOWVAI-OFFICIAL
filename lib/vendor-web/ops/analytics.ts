// Analytics display rules. Order value is never shown as earnings. Pure.
import type { AnalyticsResult } from "./types";

export const ORDER_VALUE_LABEL = "Order value, not your earnings";
export const TRUNCATED_NOTE = "Based on the latest 500 orders";
export const ANALYTICS_LABELS = {
  orders: "Orders",
  accepted: "Accepted",
  declined: "Declined",
  averageAccept: "Average time to accept",
  fulfilment: "Fulfilment rate",
  itemsSold: "Items sold",
  orderValue: ORDER_VALUE_LABEL,
} as const;

/** A fraction (0 to 1) as a whole percentage, or a dash when nothing has settled yet. */
export function formatFulfilment(rate: number | null): string {
  return rate === null ? "No settled orders yet" : `${Math.round(rate * 100)}%`;
}

/** Bar width as a percentage of the busiest day (0 when there are no orders at all). */
export function barPercent(orders: number, max: number): number {
  if (max <= 0 || orders <= 0) return 0;
  return Math.max(4, Math.round((orders / max) * 100));
}

export function busiestDay(result: AnalyticsResult): number {
  return result.ordersPerDay.reduce((m, d) => Math.max(m, d.orders), 0);
}

/** The visible text for the analytics screen, as (label, value) pairs. Used by the page and by the tests. */
export function summaryRows(result: AnalyticsResult, formatMoney: (n: number) => string, formatSec: (s: number | null) => string) {
  return [
    { label: ANALYTICS_LABELS.orders, value: String(result.totals.orders) },
    { label: ANALYTICS_LABELS.accepted, value: String(result.totals.accepted) },
    { label: ANALYTICS_LABELS.declined, value: String(result.totals.declined) },
    { label: ANALYTICS_LABELS.averageAccept, value: formatSec(result.averageAcceptSeconds) },
    { label: ANALYTICS_LABELS.fulfilment, value: formatFulfilment(result.fulfilmentRate) },
    { label: ANALYTICS_LABELS.itemsSold, value: String(result.itemsSold.reduce((s, i) => s + i.quantity, 0)) },
    { label: ANALYTICS_LABELS.orderValue, value: formatMoney(result.orderValue.amount) },
  ];
}
