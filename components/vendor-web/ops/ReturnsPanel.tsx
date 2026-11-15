"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { fetchReturns } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import { RETURNS_EMPTY, RETURNS_NOTE, returnReasonLabel, returnStatusLabel, returnTypeLabel } from "@/lib/vendor-web/ops/returns";
import type { OpsReturn } from "@/lib/vendor-web/ops/types";

/** Read-only list of return requests on this store's orders. */
export function ReturnsPanel() {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; rows: OpsReturn[]; error: string | null }>({ status: "loading", rows: [], error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const res = await fetchReturns();
      setState({ status: "ok", rows: res.returns, error: null });
    } catch (err) {
      setState({ status: "error", rows: [], error: messageFor(err) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <Skeleton lines={3} />;
  if (state.status === "error") {
    return (
      <Notice tone="error" onRetry={() => void load()}>
        {state.error}
      </Notice>
    );
  }
  if (state.rows.length === 0) return <EmptyState title={RETURNS_EMPTY.title} body={RETURNS_EMPTY.body} />;

  return (
    <>
      <p className="text-[13px] text-ink-muted">{RETURNS_NOTE}</p>
      <ul aria-label="Return requests" className="flex flex-col gap-3">
        {state.rows.map((r) => (
          <li key={r.returnId} className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-ink">
                {returnTypeLabel(r.type)} · Order {r.orderId}
              </span>
              <StatusChip tone="info">{returnStatusLabel(r.status)}</StatusChip>
            </div>
            <p className="text-[14px] text-ink">Reason: {returnReasonLabel(r.reason)}</p>
            <p className="text-[13px] text-ink-muted">{r.items.map((i) => `${i.title || "Item"} x${i.quantity}`).join(", ")}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
