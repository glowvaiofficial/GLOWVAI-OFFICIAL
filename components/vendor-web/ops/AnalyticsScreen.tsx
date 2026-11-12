"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { fetchAnalytics } from "@/lib/vendor-web/ops/api";
import { TRUNCATED_NOTE, barPercent, busiestDay, summaryRows } from "@/lib/vendor-web/ops/analytics";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import { formatRupees, formatSeconds } from "@/lib/vendor-web/ops/time";
import type { AnalyticsResult } from "@/lib/vendor-web/ops/types";

type Days = 7 | 30;

export function AnalyticsScreen() {
  const [days, setDays] = useState<Days>(7);
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; data: AnalyticsResult | null; error: string | null }>({
    status: "loading",
    data: null,
    error: null,
  });

  const load = useCallback(async (d: Days) => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await fetchAnalytics(d);
      setState({ status: "ok", data, error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: messageFor(err) }));
    }
  }, []);

  // Loads when the screen opens or the period changes. Not polled.
  useEffect(() => {
    void load(days);
  }, [days, load]);

  const data = state.data;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-ink">Analytics</h1>
        <div role="group" aria-label="Period" className="flex gap-2">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`min-h-[44px] rounded-full px-4 text-[14px] font-semibold ${days === d ? "bg-[#0057FB] text-white" : "border border-black/10 bg-white text-ink"}`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {state.status === "error" ? (
        <Notice tone="error" onRetry={() => void load(days)} retrying={false}>
          {state.error}
        </Notice>
      ) : null}
      {state.status === "loading" && !data ? <Skeleton lines={4} /> : null}

      {data ? (
        <>
          {data.bounds.truncated ? <Notice tone="info">{TRUNCATED_NOTE}</Notice> : null}

          {data.totals.orders === 0 ? (
            <EmptyState title={`No orders in the last ${days} days`} body="Orders your store accepts or declines show here." />
          ) : null}

          <Card title="Summary">
            <dl className="grid gap-3 sm:grid-cols-2">
              {summaryRows(data, formatRupees, formatSeconds).map((row) => (
                <div key={row.label} className="rounded-xl bg-[#F6F7FA] p-3">
                  <dt className="text-[13px] text-ink-muted">{row.label}</dt>
                  <dd className="mt-0.5 text-[18px] font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] text-ink-muted">Fulfilment is orders packed or later, out of orders that have settled (packed or cancelled).</p>
          </Card>

          <Card title="Orders per day">
            <OrdersPerDay data={data} />
          </Card>

          <Card title="Items sold" description="Top 10 by quantity">
            {data.itemsSold.length === 0 ? (
              <p className="text-[14px] text-ink-muted">No items sold in this period.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {data.itemsSold.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 text-[15px] text-ink">
                    <span>{item.title}</span>
                    <span className="font-semibold">{item.quantity}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Order value">
            <p className="text-[24px] font-semibold text-ink">{formatRupees(data.orderValue.amount)}</p>
            <p className="mt-1 text-[14px] text-ink-muted">Order value, not your earnings</p>
            <p className="mt-1 text-[13px] text-ink-muted">From {data.orderValue.orderCount} orders.</p>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function OrdersPerDay({ data }: { data: AnalyticsResult }) {
  const max = busiestDay(data);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2" aria-label="Orders per day, as bars">
        {data.ordersPerDay.map((row) => (
          <li key={row.date} aria-hidden="true" className="grid grid-cols-[88px_1fr_36px] items-center gap-3 text-[13px] text-ink">
            <span className="text-ink-muted">{row.date}</span>
            <span className="h-3 rounded-full bg-[#ECEEF2]">
              <span className="block h-3 rounded-full bg-[#0057FB]" style={{ width: `${barPercent(row.orders, max)}%` }} />
            </span>
            <span className="text-right font-semibold">{row.orders}</span>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px] text-ink">
          <caption className="sr-only">Orders per day</caption>
          <thead>
            <tr className="border-b border-black/10 text-ink-muted">
              <th scope="col" className="py-2 font-medium">Date</th>
              <th scope="col" className="py-2 font-medium">Orders</th>
              <th scope="col" className="py-2 font-medium">Accepted</th>
              <th scope="col" className="py-2 font-medium">Declined</th>
            </tr>
          </thead>
          <tbody>
            {data.ordersPerDay.map((row) => (
              <tr key={row.date} className="border-b border-black/5">
                <th scope="row" className="py-2 font-normal">{row.date}</th>
                <td className="py-2">{row.orders}</td>
                <td className="py-2">{row.accepted}</td>
                <td className="py-2">{row.declined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
