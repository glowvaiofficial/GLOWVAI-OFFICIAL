// A small in-memory stand-in for the Firestore pieces the stock code uses: collection().doc(), getAll, get, update and
// runTransaction. Writes are staged and only committed when the transaction function returns, so a throw leaves every
// product untouched (the same all-or-nothing rule Firestore gives). A read after a write is an error, as in Firestore.
import type { Firestore, Transaction } from "firebase-admin/firestore";

type Doc = Record<string, unknown>;

interface Ref {
  path: string;
  id: string;
}

interface Snap {
  id: string;
  exists: boolean;
  ref: Ref;
  data: () => Doc | undefined;
}

const clone = <T>(v: T): T => structuredClone(v);

export class FakeStore {
  docs: Map<string, Doc>;

  constructor(init: Record<string, Doc>) {
    this.docs = new Map(Object.entries(init).map(([path, doc]) => [path, clone(doc)]));
  }

  collection(name: string) {
    return {
      doc: (id: string): Ref => ({ path: `${name}/${id}`, id }),
    };
  }

  get(path: string): Doc | undefined {
    const doc = this.docs.get(path);
    return doc ? clone(doc) : undefined;
  }

  // Read helpers for the tests.
  product(id: string): Doc {
    const doc = this.get(`products/${id}`);
    if (!doc) throw new Error(`no product ${id}`);
    return doc;
  }

  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const staged = new Map([...this.docs].map(([k, v]) => [k, clone(v)] as const));
    let wrote = false;
    const snapOf = (ref: Ref): Snap => {
      const doc = staged.get(ref.path);
      return { id: ref.id, exists: !!doc, ref, data: () => (doc ? clone(doc) : undefined) };
    };
    const tx = {
      getAll: async (...refs: Ref[]) => {
        if (wrote) throw new Error("Firestore rule: all reads must happen before any write");
        return refs.map(snapOf);
      },
      get: async (ref: Ref) => {
        if (wrote) throw new Error("Firestore rule: all reads must happen before any write");
        return snapOf(ref);
      },
      update: (ref: Ref, data: Doc) => {
        wrote = true;
        const current = staged.get(ref.path);
        if (!current) throw new Error(`NOT_FOUND ${ref.path}`);
        staged.set(ref.path, { ...current, ...clone(data) });
      },
    };
    const out = await fn(tx as unknown as Transaction);
    this.docs = staged;
    return out;
  }
}

// The stub as a Firestore for the code that takes one.
export const asFirestore = (store: FakeStore): Firestore => store as unknown as Firestore;
