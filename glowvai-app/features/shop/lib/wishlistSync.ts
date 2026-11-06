// Keeps the device wishlist and the account wishlist (users/{uid}/wishlist) together. The device copy works offline and
// for a visitor who has not signed in; the account copy follows the customer to other devices.
import { addToWishlistRequest, fetchWishlist, removeFromWishlistRequest } from '../../../core/services/shopApi';
import { mergeWishlists } from '../../../../lib/shop/wishlist';

// First load in a session: merges the device list into the account and returns the merged list (device and account
// now hold the same items). Null when the account could not be reached; the device list then stays as it is and is
// merged on the next load.
export async function syncWishlistWithAccount(device: string[]): Promise<string[] | null> {
  const got = await fetchWishlist();
  if (!got.ok || !got.data) return null;
  const { merged, toPushToAccount } = mergeWishlists(device, got.data.items);
  if (toPushToAccount.length > 0) {
    const put = await addToWishlistRequest(toPushToAccount);
    if (!put.ok) return null;
  }
  return merged;
}

// A save or removal made on the device is sent to the account. A failure is not shown: the device keeps the change and
// the next sign-in merges it again.
export function pushWishlistAdd(productId: string): void {
  void addToWishlistRequest([productId]);
}

export function pushWishlistRemove(productId: string): void {
  void removeFromWishlistRequest(productId);
}
