// One checkout attempt sends one Idempotency-Key with POST /api/shop/orders. The server returns the order it already
// created for the same key and customer (within 24 hours) instead of creating a second one, so "Try again" after a lost
// answer or a closed payment window never places a second order. Pure (no imports), so the node tests load it.
//
// - The same request (same lines, address, slot, coupon, tip, coins and method) keeps its key while it is not placed.
// - A changed request gets a new key: it is a different order.
// - A placed attempt is never reused: the next checkout starts a new key.

export interface AttemptLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface OrderAttemptKey {
  key: string;
  signature: string;
  placed: boolean;
}

type RandomBytes = (n: number) => Uint8Array;

const defaultBytes: RandomBytes = (n) => {
  const out = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
};

/** A new key: "gvw_" and 24 hex characters (96 random bits). Matches the server's accepted form (8 to 200 printable characters). */
export function newAttemptKey(bytes: RandomBytes = defaultBytes): string {
  return `gvw_${Array.from(bytes(12), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Everything that makes two order requests the same request, in a stable form (line order does not matter). */
export function orderSignature(body: {
  items: readonly AttemptLine[];
  addressId?: string | null;
  address?: unknown;
  deliverySlot?: string | null;
  couponCode?: string | null;
  tip?: number;
  coinsToRedeem?: number;
  paymentMethod: string;
}): string {
  const lines = body.items
    .map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: Math.floor(l.quantity) }))
    .sort((a, b) => `${a.productId}::${a.variantId ?? ''}`.localeCompare(`${b.productId}::${b.variantId ?? ''}`));
  return JSON.stringify([
    lines,
    body.addressId ?? null,
    body.addressId ? null : body.address ?? null,
    body.deliverySlot ?? null,
    body.couponCode || null,
    body.tip ?? 0,
    body.coinsToRedeem ?? 0,
    body.paymentMethod,
  ]);
}

/** The attempt for this request: the existing one when it is the same request and not placed, else a new one. */
export function attemptFor(existing: OrderAttemptKey | null | undefined, signature: string, makeKey: () => string = () => newAttemptKey()): OrderAttemptKey {
  if (existing && !existing.placed && existing.signature === signature) return existing;
  return { key: makeKey(), signature, placed: false };
}

/** The attempt after its order was placed (cash on delivery accepted, or online payment confirmed). */
export const markPlaced = (attempt: OrderAttemptKey): OrderAttemptKey => ({ ...attempt, placed: true });

// Statuses of an order that went through (paid or cash on delivery, and not cancelled).
const LIVE_STATUSES = new Set(['PLACED', 'CONFIRMED', 'ACCEPTED', 'VENDOR_ACCEPTED', 'PACKED', 'READY_FOR_PICKUP', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']);

/**
 * What to do with a reply the server sent for a key it had already seen (`replayed: true`):
 *   null      not a replay, or a replay that still carries a payment to open: the normal path handles it.
 *   'placed'  the earlier attempt's order went through (for example its answer was lost): show that order as placed.
 *   'reset'   the earlier order can no longer be paid or used (expired, cancelled): drop the key so the next try is new.
 */
export function replayDecision(data: { replayed?: unknown; payment?: unknown; status?: unknown; orderId?: unknown } | null | undefined): 'placed' | 'reset' | null {
  if (!data || data.replayed !== true) return null;
  if (data.payment) return null;
  const status = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  return typeof data.orderId === 'string' && data.orderId && LIVE_STATUSES.has(status) ? 'placed' : 'reset';
}
