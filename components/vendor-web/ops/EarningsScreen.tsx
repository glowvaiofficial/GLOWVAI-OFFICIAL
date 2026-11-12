"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/vendor-web/ui/Card";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { fetchAnalytics } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import { formatRupees } from "@/lib/vendor-web/ops/time";
import type { AnalyticsResult } from "@/lib/vendor-web/ops/types";

// Earnings are not shown yet: GlowVai has not set up payouts. The only figure here is the gross order value from
// analytics, labelled as such. No percentages, fees or payouts.
export function EarningsScreen() {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; data: AnalyticsResult | null; error: string | null }>({
    status: "loading",
    data: null,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await fetchAnalytics(30);
      setState({ status: "ok", data, error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: messageFor(err) }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Earnings</h1>

      <Card title="Settlements">
        <p className="text-[15px] text-ink">Settlements will appear here once GlowVai sets up payouts.</p>
      </Card>

      <Card title="Order value, last 30 days">
        {state.status === "loading" ? <Skeleton lines={1} /> : null}
        {state.status === "error" ? (
          <Notice tone="error" onRetry={() => void load()} retrying={false}>
            {state.error}
          </Notice>
        ) : null}
        {state.status === "ok" && state.data ? (
          <>
            <p className="text-[24px] font-semibold text-ink">{formatRupees(state.data.orderValue.amount)}</p>
            <p className="mt-1 text-[14px] text-ink-muted">Order value, not your earnings</p>
            {state.data.bounds.truncated ? <p className="mt-1 text-[13px] text-ink-muted">Based on the latest 500 orders</p> : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
