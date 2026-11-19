// Watches the signed-in customer's orders and raises messages when they change.
//
// It adds no requests of its own: it calls the store's loadOrders (GET /api/shop/orders) at most once every 60 seconds,
// and only while the tab is visible and a customer session exists. It never starts a sign-in. When the customer is
// signed out, the timer stops. Changes are read from the orders the store already holds.
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useCustomerStore } from '../state/customerStore';
import type { ShopOrder } from '../services/shopApi';
import { collectOrderEvents, messageFor, type OrderEvent } from './orderEvents';
import { readSeen, writeSeen } from './seenStorage';
import { QUIET_MS, isFreshEventOrder } from './orderPopupGuards';
import { useNotificationStore, type NotificationMessage } from './notificationStore';

export const POLL_INTERVAL_MS = 60_000;
// The timer checks more often than it fetches, so a fetch happens about every 60 seconds and never sooner.
const CHECK_INTERVAL_MS = 15_000;

let messageCounter = 0;

const toMessages = (events: OrderEvent[]): NotificationMessage[] => {
  const stamp = Date.now();
  return events.map((event) => {
    messageCounter += 1;
    return { ...messageFor(event), id: `${event.orderId}:${event.kind}:${stamp}:${messageCounter}` };
  });
};

// Records the statuses and raises messages for any change. The very first record for a customer is silent.
// The first orders loaded for a customer in this page session only refresh the stored record. A status that changed
// while the site was closed (an old cancellation, say) is never replayed as a dialog on a later visit.
const processOrders = (uid: string, orders: ShopOrder[], baselined: Set<string>, startedAt: number) => {
  const seen = readSeen(uid);
  const quiet = Date.now() - startedAt < QUIET_MS;
  const announce = baselined.has(uid) && !quiet;
  baselined.add(uid);
  const { events, next } = collectOrderEvents(orders, seen, announce);
  writeSeen(uid, next);
  if (!announce || !seen || events.length === 0) return;
  const createdById = new Map(orders.map((o) => [String((o as { orderId?: unknown }).orderId ?? ''), (o as { createdAt?: unknown }).createdAt] as const));
  const fresh = events.filter((e) => isFreshEventOrder(createdById.get(e.orderId)));
  if (fresh.length > 0) useNotificationStore.getState().push(toMessages(fresh));
};

// Starts watching. Returns a function that stops everything (used when the component unmounts).
export function startOrderNotifier(): () => void {
  let stopped = false;
  let uid: string | null = null;
  let timer: number | null = null;
  let lastFetchAt = 0;
  const baselined = new Set<string>();
  const startedAt = Date.now();

  const fetchIfDue = () => {
    if (stopped || !uid) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (Date.now() - lastFetchAt < POLL_INTERVAL_MS) return;
    lastFetchAt = Date.now();
    void useCustomerStore.getState().loadOrders();
  };

  const startTimer = () => {
    if (timer !== null) return;
    timer = window.setInterval(fetchIfDue, CHECK_INTERVAL_MS);
  };

  const stopTimer = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  // Orders loaded by any screen are compared too, so a message is not missed when a screen refreshes first.
  const unsubscribeOrders = useCustomerStore.subscribe((state, previous) => {
    if (stopped || !uid || state.orders === previous.orders) return;
    processOrders(uid, state.orders, baselined, startedAt);
  });

  const onVisibility = () => {
    if (document.visibilityState === 'visible') fetchIfDue();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
    if (stopped) return;
    if (!user) {
      uid = null;
      stopTimer();
      return;
    }
    uid = user.uid;
    startTimer();
    fetchIfDue();
  });

  return () => {
    stopped = true;
    uid = null;
    stopTimer();
    unsubscribeOrders();
    unsubscribeAuth();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
