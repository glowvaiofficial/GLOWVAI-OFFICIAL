// Which orders a vendor may see and accept, and the only order shape the vendor app ever receives. Pure functions.
//
// Privacy (PRD 3.3, 9.1): the projection is built from an allow-list. The customer's phone, address, landmark,
// coordinates, email, userId, payment ids and tracking id are never copied. The customer's first name is added only
// once this vendor has accepted the order.
import { lineKeyOf } from "../shop/variants";
import { parseSubstitutionPreference, type SubstitutionPreference } from "../shop/preferences";
import type { OperatingVendor } from "./state";
import { orderTimeline, type TimelineStep } from "./vendorView";

type Doc = Record<string, unknown>;

/** An offer is visible only while the vendor was seen in the last 3 minutes (heartbeat every 60 s). */
export const OFFER_FRESHNESS_MS = 3 * 60_000;

export interface VendorOrderItem {
  productId: string;
  /** The option the customer chose, for a product with options. */
  variantId: string | null;
  variantLabel: string | null;
  title: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface VendorOrder {
  orderId: string;
  reference: string;
  status: string;
  vendorStatus: string;
  isOffer: boolean;
  items: VendorOrderItem[];
  itemCount: number;
  itemsValue: number;
  placedAt: number;
  updatedAt: number;
  acceptedAt?: number;
  packedAt?: number;
  customerFirstName?: string;
  cancelled: boolean;
  cancellationReason?: string;
  /** The customer's substitution preference. Read-only for the vendor; null on older orders. */
  substitutionPreference: SubstitutionPreference | null;
  /** Stages reached so far (my orders only). */
  timeline: TimelineStep[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const declinedBy = (order: Doc): string[] => {
  const d = (order.dispatch ?? {}) as Doc;
  return Array.isArray(d.declinedBy) ? d.declinedBy.map(String) : [];
};

export const orderPincode = (order: Doc): string => str(((order.shippingAddress ?? {}) as Doc).pincode).trim();

export const isStaffCancelled = (overlay: Doc | null | undefined) => str(overlay?.fulfilment).toUpperCase() === "CANCELLED";

export const isUnassigned = (order: Doc) => (order.vendorId === null || order.vendorId === undefined || order.vendorId === "") && !order.vendorUid;

export type OfferBlock = "NOT_PLACED" | "ASSIGNED" | "NOT_OPERATING" | "OFFLINE" | "STALE" | "PINCODE" | "DECLINED";

/**
 * Why `order` is not in `vendor`'s offer pool, or null when it is. `ignoreFreshness` is used for accept/decline:
 * the request itself shows the vendor is present.
 */
export function offerBlock(order: Doc, vendor: OperatingVendor, now: number, opts: { ignoreFreshness?: boolean } = {}): OfferBlock | null {
  if (!isUnassigned(order)) return "ASSIGNED";
  if (str(order.status) !== "PLACED") return "NOT_PLACED";
  if (!vendor.canOperate) return "NOT_OPERATING";
  if (!vendor.isOnline) return "OFFLINE";
  if (!opts.ignoreFreshness && (vendor.lastSeenAt === null || now - vendor.lastSeenAt > OFFER_FRESHNESS_MS)) return "STALE";
  const pin = orderPincode(order);
  if (!pin || !vendor.servicePincodes.includes(pin)) return "PINCODE";
  if (declinedBy(order).includes(vendor.uid)) return "DECLINED";
  return null;
}

export const isOfferFor = (order: Doc, vendor: OperatingVendor, now: number) => offerBlock(order, vendor, now) === null;

export const isMine = (order: Doc, uid: string) => str(order.vendorUid) === uid && uid !== "";

/** The customer's first name, without anything that looks like contact details. */
export function firstName(order: Doc): string | undefined {
  const full = str(order.customerName) || str(((order.shippingAddress ?? {}) as Doc).recipientName);
  const first = full.trim().split(/\s+/)[0] ?? "";
  if (!first || first.length > 40 || /[\d@]/.test(first)) return undefined;
  return first;
}

// Free-text reasons may contain a phone number or email; hide them before they reach the vendor.
export function scrubContact(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "•••")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "•••")
    .slice(0, 200);
}

export function orderItems(order: Doc): VendorOrderItem[] {
  return (Array.isArray(order.items) ? order.items : []).map((raw) => {
    const it = (raw ?? {}) as Doc;
    return {
      productId: str(it.productId),
      variantId: str(it.variantId) || null,
      variantLabel: str(it.variantLabel) || null,
      title: str(it.productName) || str(it.title),
      brand: str(it.brand),
      quantity: Math.max(0, Math.floor(num(it.quantity))),
      unitPrice: num(it.unitPrice),
      imageUrl: str(it.imageUrl),
    };
  });
}

export interface NeededLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  title: string;
}

/**
 * Quantity needed per stock line: one line per product, or per option of a product. The map is keyed by the stock line
 * key (see lineKeyOf), so a product with options and a product without never share a line.
 */
export function neededStock(order: Doc): Map<string, NeededLine> {
  const need = new Map<string, NeededLine>();
  for (const it of orderItems(order)) {
    if (!it.productId || it.quantity <= 0) continue;
    const variantId = it.variantId;
    const key = lineKeyOf(it.productId, variantId);
    const prev = need.get(key);
    need.set(key, { productId: it.productId, variantId, quantity: (prev?.quantity ?? 0) + it.quantity, title: prev?.title || it.title });
  }
  return need;
}

export interface StockLine {
  /** The stock line key: the product id, or "productId::variantId". */
  productId: string;
  exists: boolean;
  stock: number;
  isAvailable: boolean;
}

/** Items the vendor cannot supply: `have` is 0 when the product or option is unavailable or not stocked. */
export function missingStock(order: Doc, inventory: StockLine[]): { productId: string; variantId: string | null; title: string; need: number; have: number }[] {
  const byKey = new Map(inventory.map((l) => [l.productId, l]));
  const missing: { productId: string; variantId: string | null; title: string; need: number; have: number }[] = [];
  for (const [key, { productId, variantId, quantity, title }] of neededStock(order)) {
    const line = byKey.get(key);
    const have = line && line.exists && line.isAvailable ? Math.max(0, Math.floor(line.stock)) : 0;
    if (have < quantity) missing.push({ productId, variantId, title, need: quantity, have });
  }
  return missing;
}

/** Every product in the order is in `checked` (one tick per product id); returns the product ids still unchecked. */
export function uncheckedItems(order: Doc, checked: string[]): string[] {
  const products = new Set([...neededStock(order).values()].map((n) => n.productId));
  return [...products].filter((id) => !checked.includes(id));
}

export function toVendorOrder(order: Doc, opts: { uid: string; isOffer: boolean; overlay?: Doc | null; orderId?: string }): VendorOrder {
  const orderId = str(order.orderId) || opts.orderId || "";
  const items = orderItems(order);
  const mine = isMine(order, opts.uid);
  const staffCancelled = isStaffCancelled(opts.overlay);
  const cancelled = staffCancelled || str(order.status) === "CANCELLED";
  const out: VendorOrder = {
    substitutionPreference: parseSubstitutionPreference(order.substitutionPreference),
    timeline: mine ? orderTimeline(order) : [],
    orderId,
    reference: orderId,
    status: cancelled ? "CANCELLED" : str(order.status) || "PLACED",
    vendorStatus: mine ? str(order.vendorStatus) || "PENDING" : "PENDING",
    isOffer: opts.isOffer && !mine,
    items,
    itemCount: items.reduce((s, it) => s + it.quantity, 0),
    itemsValue: Math.round(items.reduce((s, it) => s + it.unitPrice * it.quantity, 0) * 100) / 100,
    placedAt: num(order.createdAt),
    updatedAt: num(order.updatedAt),
    cancelled,
  };
  if (mine) {
    if (num(order.vendorAcceptedAt)) out.acceptedAt = num(order.vendorAcceptedAt);
    if (num(order.vendorPackedAt)) out.packedAt = num(order.vendorPackedAt);
    if (out.acceptedAt) {
      const first = firstName(order);
      if (first) out.customerFirstName = first;
    }
  }
  if (cancelled) {
    const reason = str(opts.overlay?.cancellationReason) || str(order.cancellationReason);
    if (reason) out.cancellationReason = scrubContact(reason);
  }
  return out;
}
