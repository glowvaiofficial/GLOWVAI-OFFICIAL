// In-memory GrowthRepo for the growth tests. It follows the Firestore rules the modules rely on: transactions read a
// consistent snapshot, every read comes before every write (a violation throws), a transaction whose reads changed is
// retried (optimistic concurrency), and create fails when the document exists.
import type { GrowthRef, GrowthRepo, GrowthSnap, GrowthTx, QueryOp } from "../../lib/shop/growth/repo";

interface Doc {
  data: Record<string, unknown>;
  version: number;
}

class Conflict extends Error {}

const clone = (v: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(v));

function snapOf(path: string, doc: Doc | undefined): GrowthSnap {
  const id = path.split("/").pop() ?? "";
  return {
    exists: doc !== undefined,
    id,
    data: () => (doc ? clone(doc.data) : undefined),
  };
}

type Write =
  | { op: "create"; path: string; data: Record<string, unknown> }
  | { op: "set"; path: string; data: Record<string, unknown>; merge: boolean }
  | { op: "update"; path: string; data: Record<string, unknown> };

export class MemoryRepo implements GrowthRepo {
  readonly docs = new Map<string, Doc>();
  // Number of transactions that were retried because a document they read had changed.
  retries = 0;
  // Every committed write, in order, so tests can check what was (and was not) written.
  readonly log: string[] = [];

  ref = (path: string): GrowthRef => ({ path });

  get = async (ref: GrowthRef): Promise<GrowthSnap> => snapOf(ref.path, this.docs.get(ref.path));

  seed(path: string, data: Record<string, unknown>): void {
    this.docs.set(path, { data: clone(data), version: 1 });
  }

  data(path: string): Record<string, unknown> | undefined {
    const d = this.docs.get(path);
    return d ? clone(d.data) : undefined;
  }

  async query(
    collection: string,
    filters: Array<[string, QueryOp, unknown]>,
    options: { limit: number; orderByDesc?: string },
  ): Promise<GrowthSnap[]> {
    const prefix = `${collection}/`;
    let rows = [...this.docs.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
    rows = rows.filter(([, d]) =>
      filters.every(([field, op, value]) => {
        const actual = d.data[field];
        if (op === "==") return actual === value;
        return typeof actual === "number" && typeof value === "number" && actual <= value;
      }),
    );
    if (options.orderByDesc) {
      const field = options.orderByDesc;
      rows.sort(([, a], [, b]) => Number(b.data[field] ?? 0) - Number(a.data[field] ?? 0));
    }
    return rows.slice(0, options.limit).map(([p, d]) => snapOf(p, d));
  }

  async runTx<T>(fn: (tx: GrowthTx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const tx = new MemoryTx(this);
      try {
        const result = await fn(tx);
        tx.commit();
        return result;
      } catch (err) {
        if (err instanceof Conflict) {
          this.retries++;
          continue;
        }
        throw err;
      }
    }
    throw new Error("transaction kept conflicting");
  }
}

class MemoryTx implements GrowthTx {
  private readonly reads = new Map<string, number>();
  private readonly writes: Write[] = [];

  private readonly repo: MemoryRepo;

  constructor(repo: MemoryRepo) {
    this.repo = repo;
  }

  async get(ref: GrowthRef): Promise<GrowthSnap> {
    if (this.writes.length > 0) throw new Error("Firestore transactions require all reads to be executed before all writes.");
    const doc = this.repo.docs.get(ref.path);
    this.reads.set(ref.path, doc?.version ?? 0);
    return snapOf(ref.path, doc);
  }

  create(ref: GrowthRef, data: Record<string, unknown>): void {
    this.writes.push({ op: "create", path: ref.path, data: clone(data) });
  }

  set(ref: GrowthRef, data: Record<string, unknown>, options?: { merge?: boolean }): void {
    this.writes.push({ op: "set", path: ref.path, data: clone(data), merge: options?.merge === true });
  }

  update(ref: GrowthRef, data: Record<string, unknown>): void {
    this.writes.push({ op: "update", path: ref.path, data: clone(data) });
  }

  commit(): void {
    for (const [path, version] of this.reads) {
      if ((this.repo.docs.get(path)?.version ?? 0) !== version) throw new Conflict(path);
    }
    // Apply on a copy first, so a failing write (for example a create on an existing document) changes nothing.
    const staged = new Map<string, Doc | undefined>();
    const current = (path: string) => (staged.has(path) ? staged.get(path) : this.repo.docs.get(path));
    for (const w of this.writes) {
      const existing = current(w.path);
      if (w.op === "create") {
        if (existing) throw new Error(`ALREADY_EXISTS ${w.path}`);
        staged.set(w.path, { data: w.data, version: 1 });
      } else if (w.op === "update") {
        if (!existing) throw new Error(`NOT_FOUND ${w.path}`);
        staged.set(w.path, { data: { ...existing.data, ...w.data }, version: existing.version + 1 });
      } else {
        const base = w.merge && existing ? existing.data : {};
        staged.set(w.path, { data: { ...base, ...w.data }, version: (existing?.version ?? 0) + 1 });
      }
      this.repo.log.push(`${w.op}:${w.path}`);
    }
    for (const [path, doc] of staged) {
      if (doc) this.repo.docs.set(path, doc);
    }
  }
}
