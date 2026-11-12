"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { isVendorApiError } from "@/lib/vendor-web/errors";
import { markPacked } from "@/lib/vendor-web/ops/api";
import { PACKED_SUCCESS, SUBSTITUTION_COPY, TIMELINE_LABELS, messageFor } from "@/lib/vendor-web/ops/copy";
import { allTicked, checkedProductIds, packLines } from "@/lib/vendor-web/ops/pack";
import { formatRupees } from "@/lib/vendor-web/ops/time";
import { useOrders } from "./OrdersProvider";

export function PackScreen({ orderId }: { orderId: string }) {
  const { book, loaded, loading, error: listError, refresh, putOrder } = useOrders();
  const order = book[orderId];
  const lines = useMemo(() => (order ? packLines(order.items) : []), [order]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink orderId={orderId} />
        {listError ? (
          <Notice tone="error" onRetry={refresh} retrying={loading}>
            {listError}
          </Notice>
        ) : (
          <Skeleton lines={3} />
        )}
      </div>
    );
  }

  if (!order || order.isOffer) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink orderId={orderId} />
        <EmptyState title="This order is not in your packing list" body="Only orders your store has accepted can be packed here." />
      </div>
    );
  }

  const packed = order.status === "PACKED" || order.packedAt !== undefined;
  const waiting = order.status === "VENDOR_ACCEPTED";
  const ready = waiting && allTicked(lines, ticked);
  const substitution = order.substitutionPreference ? SUBSTITUTION_COPY[order.substitutionPreference] : null;

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await markPacked(orderId, checkedProductIds(lines));
      putOrder(res.order);
      setSuccess(PACKED_SUCCESS);
    } catch (err) {
      setActionError(messageFor(err));
      if (isVendorApiError(err) && (err.code === "ORDER_CANCELLED" || err.code === "NOT_FOUND" || err.code === "INVALID_STATE")) refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink orderId={orderId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-ink">Pack order {order.reference}</h1>
        {packed ? <StatusChip tone="ok">Packed</StatusChip> : order.cancelled ? <StatusChip tone="bad">Cancelled</StatusChip> : <StatusChip tone="warn">To pack</StatusChip>}
      </div>

      {order.customerFirstName ? <p className="text-[15px] text-ink">For {order.customerFirstName}</p> : null}

      {!waiting && !packed ? <Notice tone="warning">This order cannot be packed right now.</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}

      <Card title="Items" description="Tick each item once you have put it in the bag.">
        <ul className="flex flex-col gap-2">
          {lines.map((l) => {
            const id = `pack-${l.key}`;
            const checked = packed || ticked.has(l.key);
            return (
              <li key={l.key}>
                <label
                  htmlFor={id}
                  className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                    checked ? "border-[#B7E4C7] bg-[#EDF9F1]" : "border-black/10 bg-white"
                  }`}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="h-6 w-6"
                    checked={checked}
                    disabled={!waiting || busy}
                    onChange={() => toggle(l.key)}
                  />
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{l.title}</span>
                    <span className="block text-[13px] text-ink-muted">
                      Qty {l.quantity}
                      {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {waiting ? (
          <div className="mt-4">
            <Button fullWidth disabled={!ready || busy} loading={busy} onClick={() => void submit()}>
              Mark packed
            </Button>
            {!ready ? <p className="mt-2 text-[13px] text-ink-muted">Tick every item to enable Mark packed.</p> : null}
          </div>
        ) : null}
      </Card>

      <Card title="Substitution preference" description="Set by the customer. You cannot change it.">
        {substitution ? (
          <>
            <p className="text-[15px] font-semibold text-ink">{substitution.label}</p>
            <p className="mt-1 text-[14px] text-ink-muted">{substitution.hint}</p>
          </>
        ) : (
          <p className="text-[14px] text-ink-muted">No preference was recorded for this order.</p>
        )}
      </Card>

      <Card title="Progress">
        {order.timeline.length === 0 ? (
          <p className="text-[14px] text-ink-muted">Nothing to show yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {order.timeline.map((step) => (
              <li key={step.stage} className="flex items-center justify-between gap-3 text-[15px] text-ink">
                <span>{TIMELINE_LABELS[step.stage]}</span>
                <span className="text-[13px] text-ink-muted">{step.at ? new Date(step.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-[13px] text-ink-muted">Items: {formatRupees(order.itemsValue)}</p>
      </Card>
    </div>
  );
}

function BackLink({ orderId }: { orderId: string }) {
  return (
    <Link href={`/vendor/orders/${encodeURIComponent(orderId)}`} className="text-[14px] font-semibold text-[#0057FB]">
      ← Order
    </Link>
  );
}
