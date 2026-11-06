// Rules for riders and staff: who may assign an order, what a partner may do with an assigned order, the COD amount check,
// what the partner list shows, and what the customer may see about a delivery. Pure functions only, so the tests cover
// the exact rules the routes apply inside their transactions.

export type Doc = Record<string, unknown>;

export const ASSIGNABLE_STATUSES = ["READY_FOR_PICKUP", "PACKED"] as const;
export const OPEN_STATUSES = ["READY_FOR_PICKUP", "PACKED", "OUT_FOR_DELIVERY"] as const;
export const OUT = "OUT_FOR_DELIVERY";
export const DELIVERED = "DELIVERED";
export const LOCATION_TTL_MS = 15 * 60_000;
export const MAX_COD_RUPEES = 100_000;

export const EXCEPTION_REASONS = ["CUSTOMER_NO_CODE", "CODE_NOT_WORKING"] as const;
export type ExceptionReason = (typeof EXCEPTION_REASONS)[number];

export interface Rejection {
  ok: false;
  code: string;
  status: number;
  message: string;
}
export type Verdict = { ok: true; transition?: boolean } | Rejection;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const reject = (code: string, status: number, message: string): Rejection => ({ ok: false, code, status, message });

export const isStaffCancelled = (overlay: Doc | null | undefined) => str(overlay?.fulfilment).toUpperCase() === "CANCELLED";
export const isCancelled = (order: Doc, overlay: Doc | null | undefined) => str(order.status) === "CANCELLED" || isStaffCancelled(overlay);

export function isAssignedTo(order: Doc, partnerId: string): boolean {
  return typeof order.deliveryPartnerId === "string" && order.deliveryPartnerId !== "" && order.deliveryPartnerId === partnerId;
}

/** Staff: may this order be given to this partner? One partner per order, and the partner must be active. */
export function canAssign(order: Doc, overlay: Doc | null | undefined, partner: { id: string; active: boolean }): Verdict {
  if (!partner.active) return reject("PARTNER_INACTIVE", 409, "This delivery partner is not active.");
  if (isCancelled(order, overlay)) return reject("ORDER_CANCELLED", 409, "This order was cancelled.");
  if (!(ASSIGNABLE_STATUSES as readonly string[]).includes(str(order.status))) {
    return reject("INVALID_STATE", 409, "Only orders that are ready for pickup or packed can be assigned.");
  }
  const current = str(order.deliveryPartnerId);
  if (current && current !== partner.id) return reject("ALREADY_ASSIGNED", 409, "This order already has a delivery partner. Unassign it first.");
  if (current === partner.id) return { ok: true };
  return { ok: true, transition: true };
}

/** Staff: may this order be taken back from its partner? Not once it is out for delivery. */
export function canUnassign(order: Doc, overlay: Doc | null | undefined): Verdict {
  if (!str(order.deliveryPartnerId)) return reject("NOT_ASSIGNED", 409, "This order has no delivery partner.");
  if (isCancelled(order, overlay)) return reject("ORDER_CANCELLED", 409, "This order was cancelled.");
  if (str(order.status) === OUT) return reject("INVALID_STATE", 409, "This order is already out for delivery.");
  return { ok: true, transition: true };
}

/** Partner: starts the delivery. Allowed only for an order assigned to this partner, from READY_FOR_PICKUP or PACKED. */
export function planStart(order: Doc, overlay: Doc | null | undefined, partnerId: string): Verdict {
  if (!isAssignedTo(order, partnerId)) return reject("NOT_FOUND", 404, "We could not find that delivery.");
  if (isCancelled(order, overlay)) return reject("ORDER_CANCELLED", 409, "This order was cancelled.");
  const status = str(order.status);
  if (status === OUT) return { ok: true, transition: false };
  if (!(ASSIGNABLE_STATUSES as readonly string[]).includes(status)) {
    return reject("INVALID_STATE", 409, "This delivery cannot be started right now.");
  }
  return { ok: true, transition: true };
}

/** Partner: an order is open for delivery actions only while it is out for delivery and assigned to them. */
export function planDeliveryAction(order: Doc, overlay: Doc | null | undefined, partnerId: string): Verdict {
  if (!isAssignedTo(order, partnerId)) return reject("NOT_FOUND", 404, "We could not find that delivery.");
  if (isCancelled(order, overlay)) return reject("ORDER_CANCELLED", 409, "This order was cancelled.");
  if (str(order.status) !== OUT) return reject("INVALID_STATE", 409, "Start the delivery first.");
  return { ok: true };
}

/** Partner: the exception path. Refused while an open exception already waits for staff. */
export function planException(order: Doc, overlay: Doc | null | undefined, partnerId: string): Verdict {
  const base = planDeliveryAction(order, overlay, partnerId);
  if (!base.ok) return base;
  const open = (order.deliveryException ?? null) as Doc | null;
  if (open && str(open.status) === "OPEN") return reject("EXCEPTION_OPEN", 409, "A delivery exception is already waiting for review.");
  return { ok: true };
}

/** Order-level check of the COD cash amount: whole rupees, equal to the order total. */
export function cashVerdict(order: Doc, overlay: Doc | null | undefined, partnerId: string, amount: unknown): Verdict {
  const base = planDeliveryAction(order, overlay, partnerId);
  if (!base.ok) return base;
  const payment = (order.payment ?? {}) as Doc;
  if (str(payment.method).toUpperCase() !== "COD") return reject("NOT_COD", 409, "This order is already paid online.");
  if (order.cashCollectedAt) return reject("ALREADY_RECORDED", 409, "Cash for this order is already recorded.");
  const total = cashTotal(order);
  if (total === null) return reject("NO_TOTAL", 409, "This order has no total to collect.");
  if (!isWholeRupees(amount) || amount !== total) return reject("AMOUNT_MISMATCH", 400, "The amount does not match the order total. Check the amount and try again.");
  return { ok: true };
}

export function isWholeRupees(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_COD_RUPEES;
}

/** The total the customer pays on delivery (pricing.grandTotal), or null when it is missing. */
export function cashTotal(order: Doc): number | null {
  const total = (order.pricing as Doc | undefined)?.grandTotal;
  return isWholeRupees(total) ? total : null;
}

/** The delivery code check: the code must match and the code must not be locked. */
export function codeOpen(order: Doc, now: number): { locked: boolean; retryAfterMs: number } {
  const code = (order.deliveryCode ?? null) as Doc | null;
  const lockedUntil = typeof code?.lockedUntil === "number" ? code.lockedUntil : 0;
  return lockedUntil > now ? { locked: true, retryAfterMs: lockedUntil - now } : { locked: false, retryAfterMs: 0 };
}

export function itemsCount(order: Doc): number {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum: number, it) => sum + (Math.floor(Number((it as Doc)?.quantity)) || 0), 0);
}

export function paymentView(order: Doc): { method: "COD" | "ONLINE"; amountToCollect: number | null; paid: boolean } {
  const payment = (order.payment ?? {}) as Doc;
  const online = str(payment.method).toUpperCase() === "ONLINE";
  const paid = online && str(payment.status).toUpperCase() === "PAID";
  return { method: online ? "ONLINE" : "COD", amountToCollect: online ? null : cashTotal(order), paid };
}

/** One row of the partner's list. Only what the list needs: no name, phone or full address. */
export function assignmentView(order: Doc, overlay: Doc | null | undefined) {
  const address = (order.shippingAddress ?? {}) as Doc;
  const payment = paymentView(order);
  const exception = (order.deliveryException ?? null) as Doc | null;
  return {
    orderId: str(order.orderId) || "",
    status: str(order.status),
    itemsCount: itemsCount(order),
    area: str(address.area),
    pincode: str(address.pincode),
    payment: { method: payment.method, amountToCollect: payment.amountToCollect, paid: payment.paid },
    cashCollected: Boolean(order.cashCollectedAt),
    exceptionOpen: Boolean(exception && str(exception.status) === "OPEN"),
    cancelled: isCancelled(order, overlay),
  };
}

/** What the partner sees after "Start delivery": the address and the customer's first name, and the phone when there is one. */
export function deliveryDetailsView(order: Doc) {
  const address = (order.shippingAddress ?? {}) as Doc;
  const fullName = str(order.customerName) || str(address.recipientName);
  const phone = str(order.customerPhone) || str(address.phoneNumber);
  return {
    orderId: str(order.orderId),
    status: str(order.status),
    customerFirstName: fullName.trim().split(/\s+/)[0] ?? "",
    fullAddress: str(address.fullAddress) || str(address.streetAddress),
    landmark: str(address.landmark),
    area: str(address.area),
    city: str(address.city),
    pincode: str(address.pincode),
    customerPhone: /^[6-9]\d{9}$/.test(phone) ? phone : null,
    payment: paymentView(order),
    itemsCount: itemsCount(order),
    cashCollected: Boolean(order.cashCollectedAt),
    exceptionOpen: Boolean((order.deliveryException as Doc | undefined)?.status === "OPEN"),
  };
}

/** Rounds a coordinate to 3 decimal places (about 100 m). What a customer may see. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function validCoords(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** The stored last point, if it is still fresh. Null when it is missing, expired, or belongs to another partner. */
export function freshLocation(doc: Doc | null | undefined, partnerId: string, now: number): { lat: number; lng: number; updatedAt: number } | null {
  if (!doc || str(doc.partnerId) !== partnerId) return null;
  const expiresAt = typeof doc.expiresAt === "number" ? doc.expiresAt : 0;
  if (typeof doc.lat !== "number" || typeof doc.lng !== "number" || !validCoords(doc.lat, doc.lng) || expiresAt <= now) return null;
  return { lat: roundCoord(doc.lat), lng: roundCoord(doc.lng), updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : now };
}

/** Customer view of the rider's position: only while the order is out, the point is fresh, and it is rounded. */
export function customerLocation(order: Doc, doc: Doc | null | undefined, now: number): { lat: number; lng: number; updatedAt: number } | null {
  if (str(order.status) !== OUT) return null;
  const partnerId = str(order.deliveryPartnerId);
  if (!partnerId) return null;
  return freshLocation(doc, partnerId, now);
}

export function locationDoc(partnerId: string, lat: number, lng: number, accuracy: number | null, now: number): Doc {
  return {
    partnerId,
    lat,
    lng,
    accuracy,
    updatedAt: now,
    expiresAt: now + LOCATION_TTL_MS,
  };
}

/** Free-text note from the partner: trimmed, one line, at most 200 characters, never markup. */
export function cleanNote(v: unknown): string {
  return (typeof v === "string" ? v : "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}
