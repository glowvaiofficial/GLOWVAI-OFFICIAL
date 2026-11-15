// Keeps the device wishlist and the account wishlist (users/{uid}/wishlist) together. The device copy works offline and
// for a visitor who has not signed in; the account copy follows the customer to other devices.
//
// The device remembers which account its list mirrors (OWNER_KEY) and the saves and removals the account has not yet
// confirmed (PENDING_KEY). For that account the server list is the truth, so a removal made on another device, or one
// that failed here and is still pending, does not come back. Only a guest list is merged into the account a customer
// signs in to. The rules are in lib/shop/wishlist.ts.
import { addToWishlistRequest, fetchWishlist, removeFromWishlistRequest } from '../../../core/services/shopApi';
import {
  cleanPending,
  confirmWishlistChange,
  EMPTY_PENDING,
  reconcileWishlist,
  recordWishlistChange,
  type WishlistPending,
} from '../../../../lib/shop/wishlist';

export const WISHLIST_KEY = 'glowvai_wishlist_v1';
export const WISHLIST_PENDING_KEY = 'glowvai_wishlist_pending_v1';
export const WISHLIST_OWNER_KEY = 'glowvai_wishlist_owner_v1';

// Removals sent in one sync. Anything left stays pending for the next one.
const MAX_REMOVALS_PER_SYNC = 20;

// Set on sign-out: until the page reloads, nothing is synced or written, so the old account's list cannot come back.
let stopped = false;
export function stopWishlistSync(): void {
  stopped = true;
}

export interface WishlistOwner {
  uid: string;
  anonymous: boolean;
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (stopped) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the change is only kept for this visit.
  }
}

const readPending = (): WishlistPending => cleanPending(readJson(WISHLIST_PENDING_KEY));
const writePending = (pending: WishlistPending): void => writeJson(WISHLIST_PENDING_KEY, pending);

function readOwner(): WishlistOwner | null {
  const v = readJson(WISHLIST_OWNER_KEY) as Partial<WishlistOwner> | null;
  return v && typeof v.uid === 'string' && v.uid ? { uid: v.uid, anonymous: v.anonymous === true } : null;
}

// First load in a session: brings the device list and the account together and returns the list both now hold. Null
// when the account could not be reached; the device list and its pending changes then stay for the next load.
export async function syncWishlistWithAccount(device: string[], account: WishlistOwner): Promise<string[] | null> {
  if (stopped) return null;
  const got = await fetchWishlist();
  if (stopped || !got.ok || !got.data) return null;

  const owner = readOwner();
  let pending = readPending();
  let deviceList = device;
  const sameOwner = owner?.uid === account.uid;
  // A list left by another signed-in account on this device is never merged into this one.
  if (owner && !owner.anonymous && !sameOwner) {
    deviceList = [];
    pending = EMPTY_PENDING;
  }

  const { list, toAdd, toRemove } = reconcileWishlist({ device: deviceList, account: got.data.items, pending, sameOwner });
  let left: WishlistPending = sameOwner ? pending : EMPTY_PENDING;

  if (toAdd.length > 0) {
    const put = await addToWishlistRequest(toAdd);
    if (!put.ok) {
      // A guest list that did not reach the account is kept as pending saves for the account it now belongs to.
      if (!sameOwner) left = { adds: toAdd, removes: [] };
      writePending(left);
      writeJson(WISHLIST_OWNER_KEY, account);
      return list;
    }
    for (const id of toAdd) left = confirmWishlistChange(left, id, 'add');
  }
  for (const id of toRemove.slice(0, MAX_REMOVALS_PER_SYNC)) {
    const del = await removeFromWishlistRequest(id);
    if (del.ok) left = confirmWishlistChange(left, id, 'remove');
  }
  writePending(left);
  writeJson(WISHLIST_OWNER_KEY, account);
  return list;
}

// A save or removal made on the device is sent to the account. It stays pending until the account confirms it, so a
// failed removal is sent again on the next load instead of the item coming back.
export function pushWishlistAdd(productId: string): void {
  if (stopped) return;
  writePending(recordWishlistChange(readPending(), productId, 'add'));
  void addToWishlistRequest([productId]).then((res) => {
    if (res.ok) writePending(confirmWishlistChange(readPending(), productId, 'add'));
  });
}

export function pushWishlistRemove(productId: string): void {
  if (stopped) return;
  writePending(recordWishlistChange(readPending(), productId, 'remove'));
  void removeFromWishlistRequest(productId).then((res) => {
    if (res.ok) writePending(confirmWishlistChange(readPending(), productId, 'remove'));
  });
}
