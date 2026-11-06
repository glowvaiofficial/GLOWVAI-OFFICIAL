// Firestore side of platform stock. Every function here runs inside a transaction that the caller owns: all reads
// happen first (readProductStock), then the writes (writeStockChanges). Only products.stock and products.stockUpdatedAt
// are ever written by these helpers; the rest of the product document belongs to the catalogue.
import "server-only";
import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import { planRelease, planRetake, platformLinesOf, type ProductStock, type StockChange } from "./platformStock";

export const productRef = (store: Firestore, productId: string): DocumentReference => store.collection("products").doc(productId);

// Reads the products in one transaction. A missing product maps to undefined.
export async function readProductStock(tx: Transaction, store: Firestore, productIds: string[]): Promise<Map<string, ProductStock | undefined>> {
  const out = new Map<string, ProductStock | undefined>();
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return out;
  const snaps = await tx.getAll(...ids.map((id) => productRef(store, id)));
  snaps.forEach((snap, i) => out.set(ids[i], snap.exists ? (snap.data() as ProductStock) : undefined));
  return out;
}

// Writes the new stock for each changed product. Call only after every read in the transaction is done.
export function writeStockChanges(tx: Transaction, store: Firestore, changes: StockChange[], now: number): void {
  for (const c of changes) {
    if (c.after === c.before) continue;
    tx.update(productRef(store, c.productId), { stock: c.after, stockUpdatedAt: now });
  }
}

// Gives back an order's platform stock once. Call inside the transaction that changes the order (after its own read).
// An order without a reservation (placed before platform stock existed) is left alone.
export async function releaseStockTx(
  tx: Transaction,
  store: Firestore,
  reservation: unknown,
  now: number,
): Promise<{ patch: Record<string, unknown> }> {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || r.releasedAt) return { patch: {} };
  const stock = await readProductStock(tx, store, platformLinesOf(reservation).map((l) => l.productId));
  writeStockChanges(tx, store, planRelease(reservation, stock), now);
  return { patch: { "stockReservation.releasedAt": now } };
}

// A payment confirmed after its stock was released (a failed attempt, then a successful retry) takes the stock again.
// It never goes below zero: a short line is clamped and described in shortNote for the admin to review.
export async function retakeStockTx(
  tx: Transaction,
  store: Firestore,
  reservation: unknown,
  now: number,
): Promise<{ patch: Record<string, unknown>; shortNote: string | null }> {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || !r.releasedAt) return { patch: {}, shortNote: null };
  const stock = await readProductStock(tx, store, platformLinesOf(reservation).map((l) => l.productId));
  const { decrements, short } = planRetake(reservation, stock);
  writeStockChanges(tx, store, decrements, now);
  const shortNote = short.length
    ? `Stock was short when the payment was retaken: ${short.map((s) => `${s.name || s.productId} (${s.available} of ${s.requested} left)`).join(", ")}. Review before dispatch.`
    : null;
  return { patch: { "stockReservation.releasedAt": null }, shortNote };
}
