// Firestore storage for the account wishlist: users/{uid}/wishlist/{productId}. Server only, scoped to the verified uid.
import "server-only";
import { db } from "./server";
import { WISHLIST_MAX } from "./wishlist";
import type { WishlistRepo } from "./wishlistService";

const wishlistOf = (uid: string) => db().collection("users").doc(uid).collection("wishlist");

export const wishlistRepo: WishlistRepo = {
  async ids(uid) {
    // Capped by the query, so one customer never reads more than the wishlist limit.
    const snap = await wishlistOf(uid).limit(WISHLIST_MAX).get();
    return snap.docs.map((d) => d.id);
  },

  async add(uid, productIds, now) {
    const batch = db().batch();
    for (const productId of productIds) batch.set(wishlistOf(uid).doc(productId), { productId, addedAt: now });
    await batch.commit();
  },

  async remove(uid, productId) {
    await wishlistOf(uid).doc(productId).delete();
  },
};
