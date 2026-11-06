// The last order statuses this device has seen, per customer id. Kept in localStorage so a reload does not repeat
// old messages. Every access is wrapped: if storage is blocked, the record lives in memory for this tab only.
import type { SeenOrders, StoredOrderState } from './orderEvents';

const KEY_PREFIX = 'glowvai.orderNotifications.v1.';
const memory = new Map<string, SeenOrders>();

const isStoredState = (value: unknown): value is StoredOrderState => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.s === 'string' && typeof v.p === 'string' && typeof v.m === 'string' && typeof v.d === 'boolean';
};

const parse = (raw: string | null): SeenOrders | null => {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data.baselineAt !== 'number' || typeof data.orders !== 'object' || data.orders === null) return null;
    const orders: Record<string, StoredOrderState> = {};
    for (const [id, state] of Object.entries(data.orders as Record<string, unknown>)) {
      if (isStoredState(state)) orders[id] = state;
    }
    return { baselineAt: data.baselineAt, orders };
  } catch {
    return null;
  }
};

// Null means this customer has no record yet, so the first load is recorded without messages.
export const readSeen = (uid: string): SeenOrders | null => {
  const inMemory = memory.get(uid);
  if (inMemory) return inMemory;
  try {
    return parse(window.localStorage.getItem(KEY_PREFIX + uid));
  } catch {
    return null;
  }
};

export const writeSeen = (uid: string, seen: SeenOrders): void => {
  memory.set(uid, seen);
  try {
    window.localStorage.setItem(KEY_PREFIX + uid, JSON.stringify(seen));
  } catch {
    // Storage is full or blocked. The in-memory copy still prevents repeat messages in this tab.
  }
};
