"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { useVendorMe } from "@/lib/vendor-web/session";
import { ORDER_TABS, TAB_LABELS, ordersInTab, tabCounts, type OrderTab } from "@/lib/vendor-web/ops/merge";
import { formatRupees, placedAgoLabel } from "@/lib/vendor-web/ops/time";
import type { OpsOrder } from "@/lib/vendor-web/ops/types";
import { useOrders } from "./OrdersProvider";

const EMPTY_COPY: Record<OrderTab, { title: string; body: string }> = {
  offers: { title: "No offers right now", body: "New orders in your area appear here while you are online." },
  preparing: { title: "Nothing to prepare", body: "Orders you accept show here until you mark them packed." },
  packed: { title: "No packed orders", body: "Packed orders show here until they are handed to a rider." },
  completed: { title: "No completed orders yet", body: "Orders handed to a rider show here." },
  cancelled: { title: "No cancelled orders", body: "Orders cancelled by the customer or GlowVai show here." },
};

export function OrdersScreen() {
  const { me } = useVendorMe();
  const { book, loaded, error, loading, refresh } = useOrders();
  const [tab, setTab] = useState<OrderTab>("offers");
  const counts = tabCounts(book);
  const rows = ordersInTab(book, tab);
  const now = Date.now();
  const online = me?.isOnline === true;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Orders</h1>

      {error && loaded ? (
        <Notice tone="warning" onRetry={refresh} retrying={loading}>
          Couldn&apos;t refresh · {error}
        </Notice>
      ) : null}

      {!online && me ? (
        <p className="text-[14px] text-ink-muted">You are offline, so new offers are not shown. Orders you already accepted still are.</p>
      ) : null}

      <div role="tablist" aria-label="Order status" className="flex gap-2 overflow-x-auto pb-1">
        {ORDER_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="orders-panel"
            onClick={() => setTab(t)}
            className={`min-h-[44px] shrink-0 rounded-full px-4 text-[14px] font-semibold ${
              tab === t ? "bg-[#0057FB] text-white" : "border border-black/10 bg-white text-ink"
            }`}
          >
            {TAB_LABELS[t]}
            {loaded ? <span className="ml-1.5 opacity-80">{counts[t]}</span> : null}
          </button>
        ))}
      </div>

      <div id="orders-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-3">
        {!loaded && !error ? <Skeleton lines={3} /> : null}
        {!loaded && error ? (
          <Notice tone="error" onRetry={refresh} retrying={loading}>
            {error}
          </Notice>
        ) : null}
        {loaded && rows.length === 0 ? <EmptyState title={EMPTY_COPY[tab].title} body={EMPTY_COPY[tab].body} /> : null}
        {loaded
          ? rows.map((o) => <OrderRow key={o.orderId} order={o} tab={tab} now={now} />)
          : null}
      </div>
    </div>
  );
}

function hrefFor(order: OpsOrder, tab: OrderTab): string {
  if (tab === "preparing" && !order.isOffer) return `/vendor/orders/${encodeURIComponent(order.orderId)}/pack`;
  return `/vendor/orders/${encodeURIComponent(order.orderId)}`;
}

function OrderRow({ order, tab, now }: { order: OpsOrder; tab: OrderTab; now: number }) {
  const chip =
    tab === "offers" ? (
      <StatusChip tone="info">New offer</StatusChip>
    ) : tab === "preparing" ? (
      <StatusChip tone="warn">Preparing</StatusChip>
    ) : tab === "packed" ? (
      <StatusChip tone="ok">Packed</StatusChip>
    ) : tab === "cancelled" ? (
      <StatusChip tone="bad">Cancelled</StatusChip>
    ) : (
      <StatusChip>{order.status.replace(/_/g, " ").toLowerCase()}</StatusChip>
    );

  return (
    <Link
      href={hrefFor(order, tab)}
      className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-4 hover:bg-[#F8FAFF]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-ink">
          {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {formatRupees(order.itemsValue)}
        </span>
        {chip}
      </div>
      <p className="text-[13px] text-ink-muted">
        {tab === "offers" ? placedAgoLabel(order.placedAt, now) : `Order ${order.reference}`}
        {order.customerFirstName ? ` · For ${order.customerFirstName}` : ""}
      </p>
    </Link>
  );
}
