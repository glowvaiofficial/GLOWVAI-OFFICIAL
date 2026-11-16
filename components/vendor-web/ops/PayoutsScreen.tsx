"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { fetchPayouts } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import type { LedgerResult } from "@/lib/vendor-web/ops/ledgerTypes";
import { formatRupees } from "@/lib/vendor-web/ops/time";

const STATUS_LABEL = { PENDING: "Pending", ON_HOLD: "On hold", RELEASED: "Paid" } as const;
const money = (n: number | null) => (n === null ? "Not set" : formatRupees(n));

export function PayoutsScreen() {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; data: LedgerResult | null; error: string | null }>({
    status: "loading",
    data: null,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      setState({ status: "ok", data: await fetchPayouts(), error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: messageFor(err) }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const d = state.data;
  const tiles = d
    ? [
        { label: "Delivered order value", value: money(d.summary.gross) },
        { label: d.summary.commissionPercent === null ? "Commission" : `Commission (${d.summary.commissionPercent}%)`, value: money(d.summary.commission) },
        { label: "Your earnings", value: money(d.summary.netEarnings) },
        { label: "Paid out", value: money(d.summary.settled) },
        { label: "Balance due", value: money(d.summary.balanceDue) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Payouts</h1>

      {state.status === "loading" ? <Skeleton lines={3} /> : null}
      {state.status === "error" ? (
        <Notice tone="error" onRetry={() => void load()} retrying={false}>
          {state.error}
        </Notice>
      ) : null}

      {d ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-[13px] text-ink-muted">{t.label}</p>
                <p className="mt-1 text-[20px] font-semibold text-ink">{t.value}</p>
              </div>
            ))}
          </div>
          {d.summary.commissionPercent === null ? (
            <p className="text-[14px] text-ink-muted">GlowVai has not set a commission rate yet, so earnings and balance cannot be worked out.</p>
          ) : null}
          {d.summary.pending > 0 ? <p className="text-[14px] text-ink-muted">{formatRupees(d.summary.pending)} is in settlements not yet paid.</p> : null}
          {d.bounds.truncated ? <p className="text-[13px] text-ink-muted">Based on the latest {d.bounds.orderLimit} delivered orders.</p> : null}

          <Card title="Settlements">
            {d.settlements.length === 0 ? (
              <EmptyState title="No settlements yet" body="Settlements appear here once GlowVai prepares your payout." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-ink-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Settlement</th>
                      <th className="py-2 pr-3 font-medium">Period</th>
                      <th className="py-2 pr-3 text-right font-medium">Net payout</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.settlements.map((s) => (
                      <tr key={s.id} className="border-t border-black/10">
                        <td className="py-2 pr-3 text-ink">{s.id}</td>
                        <td className="py-2 pr-3 text-ink-muted">{s.period || "-"}</td>
                        <td className="py-2 pr-3 text-right text-ink">{formatRupees(s.netPayout)}</td>
                        <td className="py-2 text-ink">{STATUS_LABEL[s.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent delivered orders">
            {d.recentOrders.length === 0 ? (
              <EmptyState title="No delivered orders yet" body="Earnings are counted from orders once they are delivered." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-ink-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Order</th>
                      <th className="py-2 pr-3 font-medium">Delivered</th>
                      <th className="py-2 pr-3 text-right font-medium">Value</th>
                      <th className="py-2 pr-3 text-right font-medium">Commission</th>
                      <th className="py-2 text-right font-medium">You earn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentOrders.map((o) => (
                      <tr key={o.orderId} className="border-t border-black/10">
                        <td className="py-2 pr-3 text-ink">{o.orderId}</td>
                        <td className="py-2 pr-3 text-ink-muted">
                          {o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "-"}
                        </td>
                        <td className="py-2 pr-3 text-right text-ink">{formatRupees(o.gross)}</td>
                        <td className="py-2 pr-3 text-right text-ink-muted">{money(o.commission)}</td>
                        <td className="py-2 text-right text-ink">{money(o.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
