"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/vendor-web/ui/Card";
import { Button } from "@/components/vendor-web/ui/Button";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { setVendorMe, useVendorMe } from "@/lib/vendor-web/session";
import { fetchInventory, setOnline } from "@/lib/vendor-web/ops/api";
import { messageFor, storeStateCopy } from "@/lib/vendor-web/ops/copy";
import { tabCounts } from "@/lib/vendor-web/ops/merge";
import { isLowStock } from "@/lib/vendor-web/ops/inventory";
import { formatRupees, istDayStart } from "@/lib/vendor-web/ops/time";
import { useOrders } from "./OrdersProvider";

interface LowStockState {
  status: "loading" | "ok" | "error";
  count: number;
  error: string | null;
}

export function HomeScreen() {
  const { me, refresh: refreshMe, loading: meLoading, error: meError } = useVendorMe();
  const { book, loaded, error: ordersError, loading: ordersLoading, refresh: refreshOrders } = useOrders();
  const [switchBusy, setSwitchBusy] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [lowStock, setLowStock] = useState<LowStockState>({ status: "loading", count: 0, error: null });

  const loadLowStock = useCallback(async () => {
    setLowStock((s) => ({ ...s, status: "loading", error: null }));
    try {
      const res = await fetchInventory();
      setLowStock({ status: "ok", count: res.items.filter((l) => isLowStock(l.stock)).length, error: null });
    } catch (err) {
      setLowStock({ status: "error", count: 0, error: messageFor(err) });
    }
  }, []);

  // Loaded once when the screen opens. Stock is not polled.
  useEffect(() => {
    void loadLowStock();
  }, [loadLowStock]);

  if (meLoading && !me) return <Skeleton lines={4} />;
  if (!me) {
    return (
      <Notice tone="error" title="We could not load your store" onRetry={() => void refreshMe()} retrying={meLoading}>
        {meError ?? "Please try again."}
      </Notice>
    );
  }

  const online = me.isOnline === true;
  const canGoOnline = me.canOperate === true;
  const copy = storeStateCopy(me.state);

  async function toggleOnline() {
    if (!me) return;
    setSwitchBusy(true);
    setSwitchError(null);
    try {
      const res = await setOnline(!online);
      setVendorMe({ ...me, isOnline: res.isOnline, lastSeenAt: res.lastSeenAt });
    } catch (err) {
      setSwitchError(messageFor(err));
    } finally {
      setSwitchBusy(false);
    }
  }

  const counts = tabCounts(book);
  const dayStart = istDayStart(Date.now());
  const today = Object.values(book).filter((o) => !o.isOffer && !o.cancelled && o.placedAt >= dayStart);
  const todayValue = today.reduce((sum, o) => sum + o.itemsValue, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Home</h1>

      <Card title={copy.title} description={copy.body}>
        {me.reason ? <p className="mb-3 text-[14px] text-ink-muted">{me.reason}</p> : null}
        <div className="flex flex-wrap items-center gap-4">
          <StatusChip tone={online ? "ok" : "neutral"}>{online ? "Online" : "Offline"}</StatusChip>
          <Button
            variant={online ? "secondary" : "primary"}
            loading={switchBusy}
            disabled={!me || (!online && !canGoOnline)}
            onClick={() => void toggleOnline()}
            role="switch"
            aria-checked={online}
            aria-label={online ? "Store is online. Go offline" : "Store is offline. Go online"}
          >
            {online ? "Go offline" : "Go online"}
          </Button>
        </div>
        {!online && !canGoOnline ? (
          <p className="mt-3 text-[14px] text-ink-muted">You can go online once GlowVai has approved and activated your store.</p>
        ) : null}
        {online ? <p className="mt-3 text-[14px] text-ink-muted">Stay on this page to keep receiving offers. Offers stop when the tab is in the background.</p> : null}
        {switchError ? (
          <div className="mt-3">
            <Notice tone="error">{switchError}</Notice>
          </div>
        ) : null}
        {meError ? (
          <div className="mt-3">
            <Notice tone="warning" onRetry={() => void refreshMe()} retrying={meLoading}>
              {meError}
            </Notice>
          </div>
        ) : null}
      </Card>

      <section aria-labelledby="home-orders" className="grid gap-4 sm:grid-cols-2">
        <h2 id="home-orders" className="sr-only">
          Orders
        </h2>
        {!loaded && !ordersError ? (
          <div className="sm:col-span-2">
            <Skeleton lines={2} />
          </div>
        ) : null}
        {loaded || ordersError ? (
          <>
            {ordersError ? (
              <div className="sm:col-span-2">
                <Notice tone="warning" onRetry={refreshOrders} retrying={ordersLoading}>
                  Couldn&apos;t refresh · {ordersError}
                </Notice>
              </div>
            ) : null}
            {loaded ? (
              <>
                <CountCard label="Offers" value={counts.offers} href="/vendor/orders" hint={online ? "Waiting for your answer" : "Go online to see offers"} />
                <CountCard label="Preparing" value={counts.preparing} href="/vendor/orders" hint="Accepted, not packed yet" />
                <CountCard label="Packed" value={counts.packed} href="/vendor/orders" hint="Packed, waiting for pickup" />
                <Card title="Today">
                  <p className="text-[15px] text-ink">
                    {today.length} {today.length === 1 ? "order" : "orders"} · {formatRupees(todayValue)} in items
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">Order value, not your earnings. Counts only your real orders.</p>
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      <Card title="Low stock">
        {lowStock.status === "loading" ? <Skeleton lines={1} /> : null}
        {lowStock.status === "error" ? (
          <Notice tone="warning" onRetry={() => void loadLowStock()} retrying={false}>
            Couldn&apos;t load stock. {lowStock.error}
          </Notice>
        ) : null}
        {lowStock.status === "ok" ? (
          <p className="text-[15px] text-ink">
            {lowStock.count === 0 ? "No stock lines at 3 or fewer." : `${lowStock.count} stock ${lowStock.count === 1 ? "line" : "lines"} at 3 or fewer.`}{" "}
            <Link href="/vendor/inventory" className="font-semibold text-[#0057FB]">
              Open inventory
            </Link>
          </p>
        ) : null}
      </Card>

      {ordersLoading ? <span className="sr-only">Refreshing orders</span> : null}
    </div>
  );
}

function CountCard({ label, value, href, hint }: { label: string; value: number; href: string; hint: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-black/10 bg-white p-5 hover:bg-[#F8FAFF]">
      <p className="text-[14px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-[32px] font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[13px] text-ink-muted">{hint}</p>
    </Link>
  );
}
