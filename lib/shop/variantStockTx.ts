// Firestore side of variant stock. Call inside a transaction the caller owns, after every read in it. Only the
// `variants` list and `stockUpdatedAt` of a product are written here. No server-only imports, so tests can use a stub.
import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import type { VariantWrite } from "./variants";

export const productDocRef = (store: Firestore, productId: string): DocumentReference => store.collection("products").doc(productId);

// Writes the new variant list for each product whose variants changed.
export function writeVariantStockChanges(tx: Transaction, store: Firestore, writes: VariantWrite[], now: number): void {
  for (const w of writes) {
    if (w.changes.length === 0) continue;
    tx.update(productDocRef(store, w.productId), { variants: w.variants, stockUpdatedAt: now });
  }
}
