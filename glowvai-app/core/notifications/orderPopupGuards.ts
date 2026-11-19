// Pure rules (no imports) that keep an old order change from ever opening a dialog just because the shop was opened.
//  1. QUIET_MS: for the first 25 seconds after the watcher starts every change is recorded silently (it happened while
//     the shop was closed or loading).
//  2. MAX_EVENT_AGE_MS: an order created more than 48 hours ago never raises a message (an old cancellation is not news).
export const QUIET_MS = 25_000;
export const MAX_EVENT_AGE_MS = 48 * 60 * 60 * 1000;

export const isFreshEventOrder = (createdAt: unknown, now: number = Date.now()): boolean => {
  const created = Number(createdAt);
  if (!Number.isFinite(created) || created <= 0) return false;
  return now - created <= MAX_EVENT_AGE_MS;
};
