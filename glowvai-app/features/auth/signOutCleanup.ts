// Sign-out on this device: nothing of the account that signed out is left for the next person. Pure (the steps and the
// storage are passed in), so the order of the steps can be tested without Firebase.
//
// 1. While still signed in: this device's push token is removed from the account (and deleted in the browser), so the
//    old account's order updates stop arriving here.
// 2. Firebase sign-out.
// 3. Account-specific data kept in browser storage is removed: wishlist (and its pending changes), bag, saved addresses,
//    profile answers, scan result, skin quiz answers, recently viewed, order-update markers and any pending referral.
//    Settings that belong to the device (language, device id, product cache, scroll position) are kept.
// 4. The page starts again at the shop (restartAfterSignOut), so the wishlist, bag and anything else the old account
//    left in memory are dropped too, and the next session starts fresh. Every sign-out button does this.

export const ACCOUNT_LOCAL_KEYS: readonly string[] = [
  'glowvai_wishlist_v1',
  'glowvai_wishlist_pending_v1',
  'glowvai_wishlist_owner_v1',
  'glowvai:cart',
  'glowvai_cart_v1',
  'glowvai_saved_addresses_v2',
  'glowvai_account_ready',
  'glowvai_profile_answers',
  'glowvai:profile-demographics',
  '@glowvai_scan_history',
  'glowvai_skin_concerns',
  'glowvai_skin_recommendations',
  'glowvai_recent_products_v1',
  'glowvai.push.token',
  'glowvai.push.registeredAt',
  'glowvai_pending_referral_v1',
  'glowvai_referral_handled_v1',
];

// Keys that start with one of these hold per-account data under the account id.
export const ACCOUNT_LOCAL_PREFIXES: readonly string[] = ['glowvai.orderNotifications.v1.'];

type Store = Pick<Storage, 'removeItem' | 'key' | 'length'>;

export function clearAccountLocalData(store: Store | null): void {
  if (!store) return;
  try {
    const prefixed: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && ACCOUNT_LOCAL_PREFIXES.some((p) => key.startsWith(p))) prefixed.push(key);
    }
    for (const key of [...ACCOUNT_LOCAL_KEYS, ...prefixed]) store.removeItem(key);
  } catch {
    // Storage blocked: nothing was kept there.
  }
}

// How long the push token removal may hold up sign-out. A slow network never keeps the customer signed in.
export const PUSH_FORGET_TIMEOUT_MS = 5000;

export interface SignOutSteps {
  forgetPushToken: () => Promise<void>;
  signOut: () => Promise<void>;
  resetCustomer: () => void;
  /** Stops background work that would write the old account's data back before the page reloads (wishlist sync). */
  stopSync?: () => void;
  store: Store | null;
  timeoutMs?: number;
}

// Runs the steps in order. Only a failed Firebase sign-out throws; the local data is then kept, as the customer is still
// signed in.
export async function signOutThisDevice(steps: SignOutSteps): Promise<void> {
  const limit = steps.timeoutMs ?? PUSH_FORGET_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      steps.forgetPushToken().catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, limit);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  await steps.signOut();
  steps.stopSync?.();
  clearAccountLocalData(steps.store);
  steps.resetCustomer();
}

// Where the page starts again after a sign-out.
export const SIGNED_OUT_START = '/shop';

// Starts the page again at the shop. Clearing storage alone leaves the old account's wishlist and bag in memory until
// the next page load, so every sign-out ends with this. `location` is passed in so the step can be tested without a
// browser; null (no window) does nothing.
export function restartAfterSignOut(location: Pick<Location, 'assign'> | null): void {
  location?.assign(SIGNED_OUT_START);
}
