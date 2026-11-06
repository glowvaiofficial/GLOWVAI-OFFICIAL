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
