// Return requests as a vendor sees them: read only. Built from an allow-list; the customer's id, free-text note and
// staff notes are never copied. The vendor cannot decide a return or trigger a refund here.
import { RETURN_REASONS, RETURN_STATUSES, RETURN_TYPES } from "../shop/returns";

type Doc = Record<string, unknown>;

export interface VendorReturnView {
  returnId: string;
  orderId: string;
  type: string;
  reason: string;
  status: string;
  items: { productId: string; title: string; quantity: number }[];
  createdAt: number;
  updatedAt: number;
}

const ms = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = (v as { toMillis?: () => number } | null)?.toMillis;
  return typeof t === "function" ? t.call(v) : 0;
};
const pick = (list: readonly string[], v: unknown, fallback: string) => (list.includes(String(v)) ? String(v) : fallback);

export function vendorReturnView(doc: Doc, returnId: string): VendorReturnView {
  return {
    returnId,
    orderId: String(doc.orderId ?? ""),
    type: pick(RETURN_TYPES, doc.type, "RETURN"),
    reason: pick(RETURN_REASONS, doc.reason, "DAMAGED"),
    status: pick(RETURN_STATUSES, doc.status, "REQUESTED"),
    items: (Array.isArray(doc.items) ? doc.items : []).map((raw) => {
      const it = (raw ?? {}) as Doc;
      return { productId: String(it.productId ?? ""), title: String(it.title ?? ""), quantity: Number(it.quantity) || 0 };
    }),
    createdAt: ms(doc.createdAt),
    updatedAt: ms(doc.updatedAt),
  };
}

/** Splits ids into groups for Firestore `in` queries (30 at most). */
export function chunkIds(ids: string[], size = 30): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
