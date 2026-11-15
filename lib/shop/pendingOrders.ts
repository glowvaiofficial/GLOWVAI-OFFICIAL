// Firestore side of the unpaid-online-order rules (lib/shop/pendingPayment.ts): closing an unpaid order (expired or
// replaced by a newer one), reusing it for a retry of the same bag, the lazy and the daily expiry, and the reply sent
// for an Idempotency-Key replay. Every stock and coin change happens in one transaction with the order read first, so
// running any of these twice changes nothing the second time.
import "server-only";
import type { DocumentData, Firestore, Transaction } from "firebase-admin/firestore";
import { firestoreRepo, wrapTx } from "./growth/firestoreRepo";
import { releaseStockTx, retakeStockTx } from "./platformStockTx";
import { razorpayKeyId } from "./razorpay";
import {
  IDEMPOTENCY_COLLECTION,
  IDEMPOTENCY_WINDOW_MS,
  decidePendingOrder,
  idempotentOrderId,
  isPendingExpired,
  isUnpaidPending,
  coinsShortNote,
  releaseCoinsTx,
  retakeCoinsTx,
} from "./pendingPayment";

export type CloseMode = "EXPIRED" | "SUPERSEDED";

const CLOSE_TEXT: Record<CloseMode, { reason: string; event: string; coins: string }> = {
  EXPIRED: {
    reason: "Payment was not completed in time",
    event: "Order closed: the payment was not completed in time. Stock and coins were released.",
    coins: "Coins returned: the payment for order {id} was not completed",
  },
  SUPERSEDED: {
    reason: "Replaced by a newer order",
    event: "Order closed: the customer placed a newer order before paying. Stock and coins were released.",
    coins: "Coins returned: order {id} was replaced before it was paid",
  },
};

// Closes one unpaid online order: platform stock and coins go back (each once) and the order is CANCELLED. EXPIRED
// only closes an order whose payment window has passed. A paid, cancelled or COD order is never touched. A payment that
// Razorpay confirms later still places the order (verify and the webhook take the stock and coins again).
export async function closeUnpaidOrder(store: Firestore, orderId: string, mode: CloseMode, now = Date.now()): Promise<boolean> {
  const repo = firestoreRepo(store);
  const ref = store.collection("orders").doc(orderId);
  return store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const o = snap.data();
    if (!snap.exists || !o || !isUnpaidPending(o)) return false;
    if (mode === "EXPIRED" && !isPendingExpired(o, now)) return false;
    const text = CLOSE_TEXT[mode];
    // Reads first (coins, then stock), then the writes.
    const coins = await releaseCoinsTx(wrapTx(tx, store), (p) => repo.ref(p), o, {
      uid: String(o.userId ?? ""),
      orderId,
      reason: text.coins.replace("{id}", orderId),
      actor: "system",
      now,
    });
    const stock = await releaseStockTx(tx, store, o.stockReservation, now);
    coins.commit();
    tx.update(ref, {
      status: "CANCELLED",
      cancellationReason: text.reason,
      cancelledBy: "system",
      closedUnpaid: mode,
      ...stock.patch,
      ...coins.patch,
      updatedAt: now,
      events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "System", event: text.event }],
    });
    return true;
  });
}

// The customer's unpaid online orders (at most `max`). Two equality filters: served by the single-field indexes.
async function pendingOrdersOf(store: Firestore, uid: string, max = 20) {
  const snap = await store.collection("orders").where("userId", "==", uid).where("status", "==", "PAYMENT_PENDING").limit(max).get();
  return snap.docs;
}

// Lazy expiry: closes this customer's unpaid orders whose window has passed. Called when their orders are read. Never
// throws: a failure leaves the orders for the next read or the daily sweep.
export async function expirePendingForCustomer(store: Firestore, uid: string, now = Date.now()): Promise<number> {
  let closed = 0;
  try {
    for (const d of await pendingOrdersOf(store, uid)) {
      if (!isPendingExpired(d.data(), now)) continue;
      if (await closeUnpaidOrder(store, d.id, "EXPIRED", now).catch(() => false)) closed++;
    }
  } catch (err) {
    console.error("[orders] lazy expiry failed", err instanceof Error ? err.message : err);
  }
  return closed;
}

// Lazy expiry of one order the customer opened. Returns true when it was closed (read it again for the new state).
export async function expireIfStale(store: Firestore, orderId: string, order: DocumentData, now = Date.now()): Promise<boolean> {
  if (!isPendingExpired(order, now)) return false;
  return closeUnpaidOrder(store, orderId, "EXPIRED", now).catch((err) => {
    console.error("[orders] expiry failed", err instanceof Error ? err.message : err);
    return false;
  });
}

// Daily backstop (run by the existing cleanup cron): closes expired unpaid orders and deletes Idempotency-Key records
// older than their window. Bounded per run; the next run continues. Returns counts only.
export async function sweepUnpaidOrders(store: Firestore, now = Date.now(), max = 300): Promise<{ expired: number; keysDeleted: number }> {
  let expired = 0;
  const pending = await store.collection("orders").where("status", "==", "PAYMENT_PENDING").limit(max).get();
  for (const d of pending.docs) {
    if (!isPendingExpired(d.data(), now)) continue;
    if (await closeUnpaidOrder(store, d.id, "EXPIRED", now).catch(() => false)) expired++;
  }
  const keys = await store.collection(IDEMPOTENCY_COLLECTION).where("expiresAt", "<", now).limit(max).get();
  if (!keys.empty) {
    const batch = store.batch();
    keys.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return { expired, keysDeleted: keys.size };
}

// The reply for an order that already exists (an Idempotency-Key replay or a reused unpaid order). An unpaid online
// order still inside its window carries the Razorpay details, so the app can open the payment again.
export function existingOrderReply(orderId: string, o: DocumentData, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const online = String(o.payment?.method ?? "") === "ONLINE";
  const body: Record<string, unknown> = {
    ok: true,
    orderId: o.orderId ?? orderId,
    trackingId: o.trackingId ?? null,
    pricing: o.pricing ?? null,
    status: String(o.status ?? ""),
    ...extra,
  };
  if (!online) body.transactionId = o.transactionId ?? null;
  if (online && isUnpaidPending(o) && typeof o.razorpayOrderId === "string" && o.razorpayOrderId) {
    body.payment = {
      provider: "razorpay",
      keyId: razorpayKeyId(),
      razorpayOrderId: o.razorpayOrderId,
      amount: Math.round(Number(o.pricing?.grandTotal ?? 0) * 100),
      currency: "INR",
    };
  }
  return body;
}

// The order an Idempotency-Key already created for this customer, when it is still inside the 24 hour window. An
// unpaid order past its payment window is closed first, so the reply shows its real state.
export async function idempotentReplay(store: Firestore, uid: string, docId: string, now = Date.now()): Promise<Record<string, unknown> | null> {
  const rec = await store.collection(IDEMPOTENCY_COLLECTION).doc(docId).get();
  const orderId = idempotentOrderId(rec.data(), uid, now);
  if (!orderId) return null;
  const ref = store.collection("orders").doc(orderId);
  let snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== uid) return null;
  if (await expireIfStale(store, orderId, snap.data() as DocumentData, now)) snap = await ref.get();
  return existingOrderReply(orderId, snap.data() as DocumentData, { replayed: true });
}

// The Idempotency-Key record written with the order (same transaction).
export function idempotencyRecord(uid: string, orderId: string, now: number) {
  return { uid, orderId, createdAt: now, expiresAt: now + IDEMPOTENCY_WINDOW_MS };
}

export type ReuseResult =
  | { kind: "reused"; body: Record<string, unknown> }
  | { kind: "replay"; orderId: string }
  | { kind: "not-reusable" };

// A retry of the same bag inside the window: the existing unpaid order is paid instead of creating a new one. Its
// Razorpay order is reused (Razorpay refuses a second payment on an order already paid, so the customer cannot pay
// twice). If a failed payment had given its stock or coins back, they are taken again here, strictly: when they are no
// longer there the order is not reusable and the caller closes it and places a fresh order (which reports the problem).
export async function reusePendingOrder(
  store: Firestore,
  orderId: string,
  input: { uid: string; bagKey: string; grandTotal: number; now: number; idempotencyDocId: string | null },
): Promise<ReuseResult> {
  const repo = firestoreRepo(store);
  const ref = store.collection("orders").doc(orderId);
  const idemRef = input.idempotencyDocId ? store.collection(IDEMPOTENCY_COLLECTION).doc(input.idempotencyDocId) : null;
  class NotReusable extends Error {}
  try {
    return await store.runTransaction(async (tx): Promise<ReuseResult> => {
      const snap = await tx.get(ref);
      const o = snap.data();
      if (!snap.exists || !o) return { kind: "not-reusable" };
      if (decidePendingOrder(o, { uid: input.uid, bagKey: input.bagKey, grandTotal: input.grandTotal, online: true, now: input.now }) !== "REUSE") return { kind: "not-reusable" };
      if (idemRef) {
        const earlier = idempotentOrderId((await tx.get(idemRef)).data(), input.uid, input.now);
        if (earlier) return { kind: "replay", orderId: earlier };
      }
      const coins = await retakeCoinsTx(wrapTx(tx, store), (p) => repo.ref(p), o, { uid: input.uid, orderId, now: input.now, strict: true });
      if (!coins.ok) return { kind: "not-reusable" };
      const stock = await retakeStockTx(tx, store, o.stockReservation, input.now);
      // Writes already queued are dropped by throwing: the transaction does not commit.
      if (stock.shortNote) throw new NotReusable();
      coins.commit();
      const updated = { ...o, ...coins.patch, paymentAttemptAt: input.now, payment: { ...(o.payment ?? {}), status: "PENDING" } };
      tx.update(ref, {
        "payment.status": "PENDING",
        paymentAttemptAt: input.now,
        ...stock.patch,
        ...coins.patch,
        updatedAt: input.now,
        events: [...(Array.isArray(o.events) ? o.events : []), { at: input.now, actor: "Customer", event: "Payment retried (same order)" }],
      });
      if (idemRef) tx.set(idemRef, idempotencyRecord(input.uid, orderId, input.now));
      return { kind: "reused", body: existingOrderReply(orderId, updated, { reused: true }) };
    });
  } catch (err) {
    if (err instanceof NotReusable) return { kind: "not-reusable" };
    throw err;
  }
}

// Before a new order: the customer's other unpaid orders are expired, replaced, or (same bag) reused. Returns the reused
// order's reply when one was reused. Never throws for the cleanup part: a failure there only means a hold lasts until
// it expires.
export async function settlePendingBeforeOrder(
  store: Firestore,
  input: { uid: string; bagKey: string; grandTotal: number; online: boolean; now: number; idempotencyDocId: string | null },
): Promise<ReuseResult> {
  let docs: Awaited<ReturnType<typeof pendingOrdersOf>> = [];
  try {
    docs = await pendingOrdersOf(store, input.uid);
  } catch (err) {
    console.error("[orders] pending lookup failed", err instanceof Error ? err.message : err);
    return { kind: "not-reusable" };
  }
  // Newest first, so the most recent matching order is the one reused.
  const rows = docs.map((d) => ({ id: d.id, data: d.data() })).sort((a, b) => Number(b.data.createdAt ?? 0) - Number(a.data.createdAt ?? 0));
  let result: ReuseResult = { kind: "not-reusable" };
  for (const row of rows) {
    const decision = decidePendingOrder(row.data, input);
    if (decision === "SKIP") continue;
    if (decision === "REUSE" && result.kind === "not-reusable") {
      const reused = await reusePendingOrder(store, row.id, input);
      // The key already belongs to an order: nothing else is touched, that order is the answer.
      if (reused.kind === "replay") return reused;
      if (reused.kind === "reused") {
        result = reused;
        continue;
      }
    }
    await closeUnpaidOrder(store, row.id, decision === "EXPIRE" ? "EXPIRED" : "SUPERSEDED", input.now).catch((err) => {
      console.error("[orders] could not close an unpaid order", err instanceof Error ? err.message : err);
    });
  }
  return result;
}

// A payment confirmed by Razorpay (verify or the webhook) for an order whose stock or coins were given back (a failed
// attempt, or the order was closed as unpaid before the money arrived): the stock and coins are taken again, never
// below zero, and a closed order is placed again. Call right after the transaction reads the order and before any
// write; then call commit() and add `patch` and `notes` to the order update.
export async function paymentArrivalTx(
  tx: Transaction,
  store: Firestore,
  orderId: string,
  o: DocumentData,
  now: number,
): Promise<{ commit: () => void; patch: Record<string, unknown>; notes: { at: number; actor: string; event: string }[] }> {
  const repo = firestoreRepo(store);
  const coins = await retakeCoinsTx(wrapTx(tx, store), (p) => repo.ref(p), o, { uid: String(o.userId ?? ""), orderId, now, strict: false });
  const stock = await retakeStockTx(tx, store, o.stockReservation, now);
  const coinsDone = coins.ok ? coins : { commit: () => undefined, patch: {}, short: 0 };
  const notes: { at: number; actor: string; event: string }[] = [];
  const reopened = String(o.status ?? "") === "CANCELLED";
  if (reopened) notes.push({ at: now, actor: "Payment provider", event: "The payment arrived after the order was closed as unpaid, so the order was placed again." });
  if (stock.shortNote) notes.push({ at: now, actor: "Stock", event: stock.shortNote });
  const coinsNote = coinsShortNote(coinsDone.short);
  if (coinsNote) notes.push({ at: now, actor: "Coins", event: coinsNote });
  return {
    commit: coinsDone.commit,
    patch: {
      ...stock.patch,
      ...coinsDone.patch,
      ...(reopened ? { cancellationReason: null, cancelledBy: null, closedUnpaid: null, reopenedAfterPaymentAt: now } : {}),
    },
    notes,
  };
}

// A failed payment attempt: the order's stock and coins go back (each once). Call right after the transaction reads
// the order and before any write; then call commit() and add `patch` to the order update.
export async function paymentFailedTx(
  tx: Transaction,
  store: Firestore,
  orderId: string,
  o: DocumentData,
  now: number,
): Promise<{ commit: () => void; patch: Record<string, unknown> }> {
  const repo = firestoreRepo(store);
  const coins = await releaseCoinsTx(wrapTx(tx, store), (p) => repo.ref(p), o, {
    uid: String(o.userId ?? ""),
    orderId,
    reason: `Coins returned: the payment for order ${orderId} did not go through`,
    actor: "system",
    now,
  });
  const stock = await releaseStockTx(tx, store, o.stockReservation, now);
  return { commit: coins.commit, patch: { ...stock.patch, ...coins.patch } };
}
