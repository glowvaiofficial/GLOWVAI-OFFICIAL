// Wishlist rules, shared by the wishlist routes (users/{uid}/wishlist/{productId}), the device copy and the tests.
// Pure: no Firestore, no browser storage.

export const WISHLIST_MAX = 200;
export const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/;

// Keeps the valid product ids of a list, without duplicates, in their first-seen order.
export function cleanProductIds(list: unknown, max = WISHLIST_MAX): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of list) {
    if (typeof v !== "string" || !PRODUCT_ID_PATTERN.test(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

// Which of the incoming ids to add to an account that already holds `existing`. Ids already there are skipped (no
// duplicates), and the total never goes past `cap`. `full` lists the ids that did not fit.
export function planWishlistAdd(existing: string[], incoming: string[], cap = WISHLIST_MAX): { toWrite: string[]; full: string[] } {
  const have = new Set(existing);
  const room = Math.max(0, cap - have.size);
  const toWrite: string[] = [];
  const full: string[] = [];
  for (const id of cleanProductIds(incoming, Number.MAX_SAFE_INTEGER)) {
    if (have.has(id)) continue;
    if (toWrite.length < room) {
      toWrite.push(id);
      have.add(id);
    } else {
      full.push(id);
    }
  }
  return { toWrite, full };
}

// First sign-in: the device wishlist and the account wishlist become one list. The account's own items come first, then
// the device's new items, capped. The device gets the merged list; the account is given the device items it lacks.
export function mergeWishlists(device: string[], account: string[], cap = WISHLIST_MAX): {
  merged: string[];
  toPushToAccount: string[];
} {
  const accountIds = cleanProductIds(account, cap);
  const accountSet = new Set(accountIds);
  const merged = [...accountIds];
  const mergedSet = new Set(accountIds);
  for (const id of cleanProductIds(device, Number.MAX_SAFE_INTEGER)) {
    if (mergedSet.has(id) || merged.length >= cap) continue;
    merged.push(id);
    mergedSet.add(id);
  }
  return { merged, toPushToAccount: merged.filter((id) => !accountSet.has(id)) };
}

// ---- Device and account kept together (glowvai-app/features/shop/lib/wishlistSync.ts).
//
// The device remembers which account its list mirrors (the owner) and the saves and removals it has not yet confirmed
// with that account (pending). The account is the source of truth for its owner: an item removed on another device, or
// a removal that failed here and is still pending, does not come back. Only a guest list (no owner yet, or an anonymous
// browsing session) is merged into the account the customer signs in to.

export interface WishlistPending {
  adds: string[];
  removes: string[];
}

export const EMPTY_PENDING: WishlistPending = { adds: [], removes: [] };

// Cleans a stored pending record. An id is either a pending add or a pending removal, never both.
export function cleanPending(value: unknown): WishlistPending {
  const v = (value && typeof value === "object" ? value : {}) as { adds?: unknown; removes?: unknown };
  const removes = cleanProductIds(v.removes);
  const removeSet = new Set(removes);
  return { adds: cleanProductIds(v.adds).filter((id) => !removeSet.has(id)), removes };
}

// Records a save or removal made on the device. The latest change to an id wins.
export function recordWishlistChange(pending: WishlistPending, productId: string, change: "add" | "remove"): WishlistPending {
  if (!PRODUCT_ID_PATTERN.test(productId)) return pending;
  const adds = pending.adds.filter((id) => id !== productId);
  const removes = pending.removes.filter((id) => id !== productId);
  if (change === "add") adds.push(productId);
  else removes.push(productId);
  return { adds: adds.slice(-WISHLIST_MAX), removes: removes.slice(-WISHLIST_MAX) };
}

// The account confirmed a change: it is no longer pending (unless a newer, opposite change replaced it).
export function confirmWishlistChange(pending: WishlistPending, productId: string, change: "add" | "remove"): WishlistPending {
  return change === "add"
    ? { adds: pending.adds.filter((id) => id !== productId), removes: pending.removes }
    : { adds: pending.adds, removes: pending.removes.filter((id) => id !== productId) };
}

// One sync of the device with the account.
//  - sameOwner: the account's list, minus the pending removals, plus the pending saves. Items only on the device and not
//    pending were removed elsewhere, so they are dropped.
//  - not sameOwner (a guest list meeting an account): the guest list, minus its own pending removals, is merged in.
// toAdd and toRemove are the account changes still to send.
export function reconcileWishlist(input: {
  device: string[];
  account: string[];
  pending: WishlistPending;
  sameOwner: boolean;
  cap?: number;
}): { list: string[]; toAdd: string[]; toRemove: string[] } {
  const cap = input.cap ?? WISHLIST_MAX;
  const pending = cleanPending(input.pending);
  const removeSet = new Set(pending.removes);
  if (!input.sameOwner) {
    const guest = cleanProductIds(input.device, Number.MAX_SAFE_INTEGER).filter((id) => !removeSet.has(id));
    const { merged, toPushToAccount } = mergeWishlists(guest, input.account, cap);
    return { list: merged, toAdd: toPushToAccount, toRemove: [] };
  }
  const accountIds = cleanProductIds(input.account, cap);
  const accountSet = new Set(accountIds);
  const list = accountIds.filter((id) => !removeSet.has(id));
  const listSet = new Set(list);
  for (const id of pending.adds) {
    if (listSet.has(id) || list.length >= cap) continue;
    list.push(id);
    listSet.add(id);
  }
  return {
    list,
    toAdd: list.filter((id) => !accountSet.has(id)),
    toRemove: pending.removes.filter((id) => accountSet.has(id)),
  };
}
