// A small document-store interface for the growth modules. The production implementation wraps the Firebase Admin
// SDK (firestoreRepo.ts); the tests use an in-memory one with the same rules. Paths are "collection/doc[/...]".
// Transactions follow the Firestore rule: every read happens before the first write.

export interface GrowthRef {
  readonly path: string;
}

export interface GrowthSnap {
  readonly exists: boolean;
  readonly id: string;
  data(): Record<string, unknown> | undefined;
}

export interface GrowthTx {
  get(ref: GrowthRef): Promise<GrowthSnap>;
  create(ref: GrowthRef, data: Record<string, unknown>): void;
  set(ref: GrowthRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  update(ref: GrowthRef, data: Record<string, unknown>): void;
}

export type QueryOp = "==" | "<=";

export interface GrowthRepo {
  ref(path: string): GrowthRef;
  get(ref: GrowthRef): Promise<GrowthSnap>;
  // Filters are equality or "less than or equal" on one field each; orderByDesc sorts on one field, newest first.
  query(
    collection: string,
    filters: Array<[field: string, op: QueryOp, value: unknown]>,
    options: { limit: number; orderByDesc?: string },
  ): Promise<GrowthSnap[]>;
  runTx<T>(fn: (tx: GrowthTx) => Promise<T>): Promise<T>;
}
