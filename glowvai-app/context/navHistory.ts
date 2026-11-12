// Pure rules for the in-app navigation history. Every screen change is one browser history entry; the entry's state
// carries the screen, its params and the screens before it, so Back, reload and the in-app back all land on the same step.
// No React, no DOM: AppContext wires these rules to window.history.

export const NAV_STATE_KEY = 'glowvai';
export const BAG_SCREEN = 'cart-tab';
export const HOME_SCREEN = 'shop-home';

// Checkout steps after the bag. The bag itself is not in this set: Back from the bag behaves like any other screen.
const CHECKOUT_STEPS = new Set([
  'checkout',
  'checkout-review',
  'checkout-payment-method',
  'checkout-payment-processing',
  'checkout-payment-success',
  'checkout-payment-failed',
  'address-list',
  'address-add',
  'address-saved',
  'location-setup',
  'location-map-picker',
  'location-serviceability',
  'customer-details',
  'login',
]);

// Payment processing places the order when it mounts, so it is never shown again from history (Back, Forward or reload).
const NEVER_REPLAY = new Set(['checkout-payment-processing']);

const HOME_SCREENS = new Set(['home', 'shop-home']);
const SCREEN_RE = /^[a-z0-9-]{1,64}$/;

export interface NavEntry {
  screen: string;
  params: unknown;
  trail: string[];
}

export const isCheckoutStep = (screen: string): boolean => CHECKOUT_STEPS.has(screen);

// Params must survive the history state (structured clone). Anything that does not round-trip through JSON is dropped.
export function safeParams(params: unknown): unknown {
  if (params === undefined || params === null) return null;
  try {
    return JSON.parse(JSON.stringify(params)) as unknown;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

// Reads an entry written by buildState. Anything else (another page's state, Next.js router state) is not ours: null.
export function entryFromState(state: unknown): NavEntry | null {
  if (!isRecord(state) || state[NAV_STATE_KEY] !== 1) return null;
  if (typeof state.screen !== 'string' || !SCREEN_RE.test(state.screen)) return null;
  const trail = Array.isArray(state.trail)
    ? state.trail.filter((s): s is string => typeof s === 'string' && SCREEN_RE.test(s))
    : [];
  return { screen: state.screen, params: state.params ?? null, trail };
}

// The state to store for an entry. The router's own keys (__NA and friends) are kept so Next.js still reads the entry.
export function buildState(base: unknown, entry: NavEntry): Record<string, unknown> {
  return {
    ...(isRecord(base) ? base : {}),
    [NAV_STATE_KEY]: 1,
    screen: entry.screen,
    params: safeParams(entry.params),
    trail: entry.trail,
  };
}

// The step to show when a history entry is restored (Back, Forward, reload). A step that cannot be shown safely falls
// back to the bag (when it has items) or to the shop home.
export function restoreTarget(entry: NavEntry, bagUnits: number): { entry: NavEntry; fallback: boolean } {
  const fallback = (): NavEntry => ({ screen: bagUnits > 0 ? BAG_SCREEN : HOME_SCREEN, params: null, trail: [] });
  if (NEVER_REPLAY.has(entry.screen)) return { entry: fallback(), fallback: true };
  if (isCheckoutStep(entry.screen) && bagUnits === 0) return { entry: fallback(), fallback: true };
  return { entry, fallback: false };
}

// Back may never take a customer out of checkout to the home screen while the bag has items. Everything else moves one step.
export function popDecision(current: string, target: string, bagUnits: number): 'apply' | 'block' {
  return isCheckoutStep(current) && HOME_SCREENS.has(target) && bagUnits > 0 ? 'block' : 'apply';
}

export function sameEntry(a: NavEntry, b: NavEntry): boolean {
  return a.screen === b.screen && a.trail.join('|') === b.trail.join('|') && JSON.stringify(a.params) === JSON.stringify(b.params);
}
