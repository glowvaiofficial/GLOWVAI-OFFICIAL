// The Firebase Admin SDK behind the growth repo interface (repo.ts). Only the server routes use this; the rules that
// matter (idempotency, non-negative balances, one reward per referee) live in the modules, not here.
import type { Firestore, Query, Transaction } from "firebase-admin/firestore";
import type { GrowthRef, GrowthRepo, GrowthSnap, GrowthTx, QueryOp } from "./repo";

export function firestoreRepo(store: Firestore): GrowthRepo {
  const ref = (path: string): GrowthRef => ({ path });
  return {
    ref,
    get: (r) => store.doc(r.path).get() as Promise<GrowthSnap>,
    async query(collection, filters, options) {
      let q: Query = store.collection(collection);
      for (const [field, op, value] of filters as Array<[string, QueryOp, unknown]>) q = q.where(field, op, value);
      if (options.orderByDesc) q = q.orderBy(options.orderByDesc, "desc");
      const snap = await q.limit(options.limit).get();
      return snap.docs as GrowthSnap[];
    },
    runTx: (fn) => store.runTransaction((tx) => fn(wrapTx(tx, store))),
  };
}

// Adapts a Firestore transaction (owned by the caller, e.g. the order route) to the growth tx interface.
export function wrapTx(tx: Transaction, store: Firestore): GrowthTx {
  return {
    get: (r) => tx.get(store.doc(r.path)) as Promise<GrowthSnap>,
    create: (r, data) => {
      tx.create(store.doc(r.path), data);
    },
    set: (r, data, options) => {
      if (options) tx.set(store.doc(r.path), data, options);
      else tx.set(store.doc(r.path), data);
    },
    update: (r, data) => {
      tx.update(store.doc(r.path), data);
    },
  };
}
