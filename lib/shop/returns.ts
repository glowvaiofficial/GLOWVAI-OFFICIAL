// Returns and replacements for delivered orders: what a customer may ask for, the state machine staff follow, and the
// customer's view of a request. The rules are pure (no server imports) so the tests run them directly. transitionReturn
// is the one function that writes; it loads the Admin SDK lazily so importing this file never touches server config.
//
// No money moves here. A refund is issued by the existing refund route when staff approve; transitionReturn only records
// the state change (REFUNDED means "the refund was issued", recorded by staff).
import { createHash } from "node:crypto";
import { DAY_MS, deliveredAtOf, isCancelled, isDelivered, orderLines, toMillis, type Doc } from "./orderState";

export const RETURN_WINDOW_MS = 7 * DAY_MS;
export const RETURN_NOTE_MAX = 500;
export const RETURN_MAX_LINES = 20;
export const RETURN_COLLECTION = "returns";
export const RETURN_LOCK_COLLECTION = "return_item_locks";

export const RETURN_TYPES = ["RETURN", "REPLACEMENT"] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

export const RETURN_REASONS = ["DAMAGED", "WRONG_ITEM", "EXPIRED_OR_DEFECTIVE", "NOT_AS_DESCRIBED", "NO_LONGER_NEEDED"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

// A replacement is for a faulty or wrong item, so "no longer needed" is offered for returns only.
export const REPLACEMENT_REASONS: readonly ReturnReason[] = RETURN_REASONS.filter((r) => r !== "NO_LONGER_NEEDED");

export const RETURN_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKUP_SCHEDULED",
  "RECEIVED",
  "REFUNDED",
  "REPLACEMENT_SHIPPED",
  "CLOSED",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

// The allowed moves, per type. Anything not listed is refused. CLOSED is final.
export const RETURN_TRANSITIONS: Record<ReturnType, Partial<Record<ReturnStatus, readonly ReturnStatus[]>>> = {
  RETURN: {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["PICKUP_SCHEDULED", "CLOSED"],
    PICKUP_SCHEDULED: ["RECEIVED"],
    RECEIVED: ["REFUNDED"],
    REFUNDED: ["CLOSED"],
    REJECTED: ["CLOSED"],
  },
  REPLACEMENT: {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["REPLACEMENT_SHIPPED", "CLOSED"],
    REPLACEMENT_SHIPPED: ["CLOSED"],
    REJECTED: ["CLOSED"],
  },
};

export function canTransition(type: ReturnType, from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[type]?.[from]?.includes(to) ?? false;
}

export interface ReturnRequestLine {
  productId: string;
  quantity: number;
}

export interface ParsedReturnRequest {
  type: ReturnType;
  reason: ReturnReason;
  note: string;
  items: ReturnRequestLine[];
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

const PRODUCT_ID = /^[A-Za-z0-9_-]{1,140}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export const isRequestId = (value: unknown): value is string => typeof value === "string" && REQUEST_ID.test(value);

// Checks the shape of a customer's request. Quantities are bounded here; the order's quantities are checked in evaluateReturn.
export function parseReturnRequest(raw: unknown): ParseResult<ParsedReturnRequest> {
  const body = (raw ?? {}) as Doc;
  const type = String(body.type ?? "");
  if (!(RETURN_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Choose whether you want a return or a replacement.", field: "type" };
  const reason = String(body.reason ?? "");
  if (!(RETURN_REASONS as readonly string[]).includes(reason)) return { ok: false, error: "Choose a reason.", field: "reason" };
  if (type === "REPLACEMENT" && !REPLACEMENT_REASONS.includes(reason as ReturnReason)) {
    return { ok: false, error: "A replacement needs a reason about the item itself. Choose a return instead.", field: "reason" };
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > RETURN_NOTE_MAX) return { ok: false, error: `Keep the note under ${RETURN_NOTE_MAX} characters.`, field: "note" };
  if (!Array.isArray(body.items) || body.items.length === 0) return { ok: false, error: "Choose at least one item.", field: "items" };
  if (body.items.length > RETURN_MAX_LINES) return { ok: false, error: `Up to ${RETURN_MAX_LINES} items per request.`, field: "items" };
  const seen = new Set<string>();
  const items: ReturnRequestLine[] = [];
  for (const entry of body.items) {
    const line = (entry ?? {}) as Doc;
    const productId = typeof line.productId === "string" ? line.productId : "";
    const quantity = typeof line.quantity === "number" ? line.quantity : Number.NaN;
    if (!PRODUCT_ID.test(productId)) return { ok: false, error: "One of the items is not valid.", field: "items" };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { ok: false, error: "Each item needs a quantity from 1 to 99.", field: "items" };
    if (seen.has(productId)) return { ok: false, error: "Each item can be listed once.", field: "items" };
    seen.add(productId);
    items.push({ productId, quantity });
  }
  return { ok: true, value: { type: type as ReturnType, reason: reason as ReturnReason, note, items } };
}

export interface ReturnLine {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface EligibilityFailure {
  ok: false;
  status: number;
  code: "CANCELLED" | "NOT_DELIVERED" | "DELIVERY_DATE_UNKNOWN" | "WINDOW_CLOSED" | "NOT_IN_ORDER" | "QUANTITY" | "ALREADY_REQUESTED";
  error: string;
}

export interface EligibilitySuccess {
  ok: true;
  deliveredAt: number;
  windowEndsAt: number;
  lines: ReturnLine[];
}

// Whether the request may be created now. `alreadyRequested` holds the product ids an earlier request for this order
// already covers (any status), because each item can be requested only once.
export function evaluateReturn(input: {
  order: Doc;
  overlay: Doc | null | undefined;
  now: number;
  request: ParsedReturnRequest;
  alreadyRequested: ReadonlySet<string>;
}): EligibilitySuccess | EligibilityFailure {
  const { order, overlay, now, request, alreadyRequested } = input;
  if (isCancelled(order, overlay)) return fail(409, "CANCELLED", "Cancelled orders cannot be returned.");
  if (!isDelivered(order, overlay)) return fail(409, "NOT_DELIVERED", "This order has not been delivered yet.");
  const deliveredAt = deliveredAtOf(order);
  if (deliveredAt === null) {
    return fail(409, "DELIVERY_DATE_UNKNOWN", "We could not confirm when this order was delivered, so a return cannot be requested here. Contact support.");
  }
  if (deliveredAt > now + 5 * 60 * 1000) return fail(409, "DELIVERY_DATE_UNKNOWN", "We could not confirm when this order was delivered. Contact support.");
  const windowEndsAt = deliveredAt + RETURN_WINDOW_MS;
  if (now > windowEndsAt) return fail(409, "WINDOW_CLOSED", "The 7-day return window for this order has closed. Contact support for help.");

  const ordered = new Map(orderLines(order).map((l) => [l.productId, l]));
  const lines: ReturnLine[] = [];
  for (const wanted of request.items) {
    const line = ordered.get(wanted.productId);
    if (!line || line.quantity < 1) return fail(400, "NOT_IN_ORDER", "One of the items is not part of this order.");
    if (wanted.quantity > line.quantity) {
      return fail(400, "QUANTITY", `You can ask for at most ${line.quantity} of ${line.title || "this item"}.`);
    }
    if (alreadyRequested.has(wanted.productId)) {
      return fail(409, "ALREADY_REQUESTED", `${line.title || "An item"} already has a return or replacement request.`);
    }
    lines.push({ productId: line.productId, title: line.title, quantity: wanted.quantity, unitPrice: line.unitPrice });
  }
  return { ok: true, deliveredAt, windowEndsAt, lines };
}

function fail(status: number, code: EligibilityFailure["code"], error: string): EligibilityFailure {
  return { ok: false, status, code, error };
}

// The same request sent twice (a retry after a dropped connection) maps to the same return id.
export function returnIdFor(uid: string, requestId: string): string {
  return `RT-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 20).toUpperCase()}`;
}

export const RETURN_ID_PATTERN = /^RT-[A-F0-9]{20}$/;

// One lock per order item: a second request for the same item cannot be created, even by a concurrent request.
export const itemLockId = (orderId: string, productId: string): string => `${orderId}__${productId}`;

export interface CustomerReturnView {
  returnId: string;
  orderId: string;
  type: ReturnType;
  reason: ReturnReason;
  note: string;
  status: ReturnStatus;
  items: ReturnLine[];
  createdAt: number | null;
  updatedAt: number | null;
  timeline: { at: number | null; status: ReturnStatus }[];
}

// What the customer may see: their request, its status and the dates the status changed. Staff notes, actors and the
// owner id are never copied.
export function customerReturnView(doc: Doc, returnId: string): CustomerReturnView {
  const events = Array.isArray(doc.events) ? doc.events : [];
  return {
    returnId,
    orderId: String(doc.orderId ?? ""),
    type: (RETURN_TYPES as readonly string[]).includes(String(doc.type)) ? (doc.type as ReturnType) : "RETURN",
    reason: (RETURN_REASONS as readonly string[]).includes(String(doc.reason)) ? (doc.reason as ReturnReason) : "DAMAGED",
    note: typeof doc.note === "string" ? doc.note : "",
    status: (RETURN_STATUSES as readonly string[]).includes(String(doc.status)) ? (doc.status as ReturnStatus) : "REQUESTED",
    items: (Array.isArray(doc.items) ? doc.items : []).map((raw) => {
      const it = (raw ?? {}) as Doc;
      return {
        productId: String(it.productId ?? ""),
        title: String(it.title ?? ""),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      };
    }),
    createdAt: toMillis(doc.createdAt),
    updatedAt: toMillis(doc.updatedAt),
    timeline: events.slice(-50).map((raw) => {
      const e = (raw ?? {}) as Doc;
      return { at: toMillis(e.at), status: (RETURN_STATUSES as readonly string[]).includes(String(e.status)) ? (e.status as ReturnStatus) : "REQUESTED" };
    }),
  };
}

export class ReturnTransitionError extends Error {
  readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "INVALID_INPUT";
  constructor(code: "NOT_FOUND" | "INVALID_TRANSITION" | "INVALID_INPUT", message: string) {
    super(message);
    this.code = code;
  }
}

// Moves a return to `to` if the state machine allows it, and appends the event. For staff code (the admin panel), not
// a customer route. `actor` is who did it (for example "admin:<name>"); `note` is internal and never shown to customers.
export async function transitionReturn(id: string, to: ReturnStatus, actor: string, note = ""): Promise<{ returnId: string; from: ReturnStatus; to: ReturnStatus }> {
  if (!RETURN_ID_PATTERN.test(id)) throw new ReturnTransitionError("INVALID_INPUT", "Unknown return id.");
  if (!(RETURN_STATUSES as readonly string[]).includes(to)) throw new ReturnTransitionError("INVALID_INPUT", "Unknown return status.");
  const who = actor.trim();
  if (!who || who.length > 80) throw new ReturnTransitionError("INVALID_INPUT", "The actor must be named (80 characters at most).");
  const text = note.trim();
  if (text.length > RETURN_NOTE_MAX) throw new ReturnTransitionError("INVALID_INPUT", "The note is too long.");

  // Loaded here so the pure rules above can be imported without the server configuration.
  const { db } = await import("./server");
  const store = db();
  const ref = store.collection(RETURN_COLLECTION).doc(id);
  return store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.data() as Doc | undefined;
    if (!snap.exists || !doc) throw new ReturnTransitionError("NOT_FOUND", "Return not found.");
    const type = String(doc.type) as ReturnType;
    const from = String(doc.status) as ReturnStatus;
    if (!(RETURN_TYPES as readonly string[]).includes(type) || !canTransition(type, from, to)) {
      throw new ReturnTransitionError("INVALID_TRANSITION", `A ${type.toLowerCase()} cannot move from ${from} to ${to}.`);
    }
    const now = Date.now();
    const events = Array.isArray(doc.events) ? doc.events : [];
    tx.update(ref, {
      status: to,
      updatedAt: now,
      events: [...events, { at: now, actor: who, status: to, note: text }],
    });
    return { returnId: id, from, to };
  });
}
