"use client";

// Holds the vendor's orders for the operations screens and runs the only poll loop and heartbeat on those screens.
// Rules (lib/vendor-web/ops/poll.ts): orders every 20 s online / 60 s offline, only while visible, backoff after errors;
// heartbeat once a minute while online and visible. Nothing runs on screens that do not show orders (except the heartbeat).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useVendorMe } from "../../../lib/vendor-web/session";
import { fetchOrders, setOnline } from "../../../lib/vendor-web/ops/api";
import { messageFor } from "../../../lib/vendor-web/ops/copy";
import { applyOrdersPage, dropOrder, nextSince, upsertOrder, type OrderBook } from "../../../lib/vendor-web/ops/merge";
import { HEARTBEAT_MS, heartbeatActive, ordersPollDelay } from "../../../lib/vendor-web/ops/poll";
import { useTabVisible } from "../../../lib/vendor-web/ops/visibility";
import type { OpsOrder } from "../../../lib/vendor-web/ops/types";

export interface OrdersContextValue {
  book: OrderBook;
  /** True after the first successful load. */
  loaded: boolean;
  /** Message for the newest failed refresh; the last good list stays on screen. */
  error: string | null;
  loading: boolean;
  /** Manual Retry: fetch now. Ignored while a request is in flight. */
  refresh: () => void;
  /** Put an order returned by accept or pack into the list. */
  putOrder: (order: OpsOrder) => void;
  /** Remove an order after a decline. */
  dropOrderLocal: (orderId: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside OrdersProvider");
  return ctx;
}

/** Screens that show orders. Other ops screens run no order polling. */
export function showsOrders(pathname: string | null): boolean {
  if (!pathname) return false;
  return /\/vendor\/(home|orders)(\/|$)/.test(pathname);
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { me, refresh: refreshMe } = useVendorMe();
  const visible = useTabVisible();
  const pathname = usePathname();
  const online = me?.isOnline === true;
  const enabled = showsOrders(pathname) && me !== null;

  const [book, setBook] = useState<OrderBook>({});
  const [loaded, setLoaded] = useState(false);
  const [failures, setFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Bumped after every completed fetch so the poll timer restarts from that moment.
  const [cycle, setCycle] = useState(0);
  const [lastOkAt, setLastOkAt] = useState(0);

  const sinceRef = useRef<number | undefined>(undefined);
  const inflightRef = useRef(false);

  const runFetch = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    try {
      const page = await fetchOrders(sinceRef.current);
      sinceRef.current = nextSince(page);
      setBook((prev) => applyOrdersPage(prev, page));
      setLoaded(true);
      setFailures(0);
      setError(null);
      setLastOkAt(Date.now());
    } catch (err) {
      setFailures((f) => f + 1);
      setError(messageFor(err));
    } finally {
      inflightRef.current = false;
      setLoading(false);
      setCycle((c) => c + 1);
    }
  }, []);

  // Orders: poll on the agreed rhythm. A visible tab that has been away for a full interval refreshes at once.
  useEffect(() => {
    if (!enabled) return;
    const delay = ordersPollDelay({ visible, online, failures });
    if (delay === null) return;
    // Immediate fetch only when no failure is pending, so a failing server is never retried without the backoff.
    const dueNow = failures === 0 && (!loaded || Date.now() - lastOkAt >= delay);
    if (visible && dueNow) {
      void runFetch();
      return;
    }
    const timer = setTimeout(() => void runFetch(), delay);
    return () => clearTimeout(timer);
  }, [enabled, visible, online, failures, loaded, lastOkAt, cycle, runFetch]);

  // Heartbeat: keeps offers visible to this store. Never in the background, never while offline.
  useEffect(() => {
    if (!heartbeatActive({ visible, online })) return;
    const timer = setInterval(() => {
      setOnline(true).catch((err: unknown) => {
        // A refused heartbeat (for example, the store was paused) means the shared state is out of date.
        if ((err as { code?: unknown } | null)?.code === "NOT_APPROVED") void refreshMe();
      });
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [visible, online, refreshMe]);

  const refresh = useCallback(() => {
    void runFetch();
  }, [runFetch]);

  const putOrder = useCallback((order: OpsOrder) => setBook((b) => upsertOrder(b, order)), []);
  const dropOrderLocal = useCallback((orderId: string) => setBook((b) => dropOrder(b, orderId)), []);

  const value = useMemo<OrdersContextValue>(
    () => ({ book, loaded, error, loading, refresh, putOrder, dropOrderLocal }),
    [book, loaded, error, loading, refresh, putOrder, dropOrderLocal],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
