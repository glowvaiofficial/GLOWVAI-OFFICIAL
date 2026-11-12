// Polling rules for the vendor orders screens. Pure: the React provider asks these functions when to act.
//
// - Orders: every 20 s while the tab is visible and the store is online; every 60 s while visible and offline; never
//   while the tab is hidden. After errors the delay is 40 s, then 80 s, then 5 minutes, until a refresh succeeds.
// - Heartbeat: POST { isOnline: true } once a minute, only while the tab is visible and the store is online.

export const ORDERS_POLL_ONLINE_MS = 20_000;
export const ORDERS_POLL_OFFLINE_MS = 60_000;
export const ORDERS_BACKOFF_MS = [40_000, 80_000, 300_000] as const;
export const HEARTBEAT_MS = 60_000;

export interface PollState {
  visible: boolean;
  online: boolean;
  /** Consecutive failed refreshes (0 after a success). */
  failures: number;
}

/** Delay before the next orders refresh, or null when no automatic refresh should be scheduled. */
export function ordersPollDelay({ visible, online, failures }: PollState): number | null {
  if (!visible) return null;
  if (failures > 0) return ORDERS_BACKOFF_MS[Math.min(failures, ORDERS_BACKOFF_MS.length) - 1];
  return online ? ORDERS_POLL_ONLINE_MS : ORDERS_POLL_OFFLINE_MS;
}

/** True when the heartbeat should be running. */
export function heartbeatActive({ visible, online }: { visible: boolean; online: boolean }): boolean {
  return visible && online;
}
