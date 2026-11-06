// Account wishlist (users/{uid}/wishlist/{productId}) through a repo, so the rules and ownership can be tested with a
// stub store. Production uses the Firestore repo (wishlistRepo.ts), scoped to the verified uid.
import { cleanProductIds, planWishlistAdd, PRODUCT_ID_PATTERN, WISHLIST_MAX } from "./wishlist";

export interface WishlistRepo {
  // Every product id saved by one customer (at most WISHLIST_MAX).
  ids(uid: string): Promise<string[]>;
  add(uid: string, productIds: string[], now: number): Promise<void>;
  remove(uid: string, productId: string): Promise<void>;
}

export async function getWishlist(repo: WishlistRepo, uid: string): Promise<string[]> {
  return cleanProductIds(await repo.ids(uid));
}

// Adds ids to the account wishlist. Duplicates are skipped and the cap is enforced; `full` reports ids that did not fit.
export async function addToWishlist(repo: WishlistRepo, uid: string, incoming: string[], now: number): Promise<{ items: string[]; added: string[]; full: string[] }> {
  const existing = await getWishlist(repo, uid);
  const { toWrite, full } = planWishlistAdd(existing, incoming, WISHLIST_MAX);
  if (toWrite.length) await repo.add(uid, toWrite, now);
  return { items: [...existing, ...toWrite], added: toWrite, full };
}

// Removes one id. Ids that are not on this customer's wishlist are a no-op, never an error for someone else's data.
export async function removeFromWishlist(repo: WishlistRepo, uid: string, productId: string): Promise<string[]> {
  if (!PRODUCT_ID_PATTERN.test(productId)) return getWishlist(repo, uid);
  const existing = await getWishlist(repo, uid);
  if (existing.includes(productId)) await repo.remove(uid, productId);
  return existing.filter((id) => id !== productId);
}
