// Platform stock for shop products (products/{id}.stock). The rules here are pure: the routes read the products inside
// a Firestore transaction, call these functions on what they read, and write only what they return.
//
// Tracking: a product is tracked only when its stock field is a number. A product without the field is NOT tracked:
// nothing is blocked or decremented for it, so existing products keep selling until the admin sets a stock value.

export const MAX_STOCK = 1_000_000;

export interface StockLine {
  productId: string;
  quantity: number;
}

// What a route read for one product in the transaction. undefined means the product document does not exist.
export interface ProductStock {
  status?: unknown;
  stock?: unknown;
  productName?: unknown;
  brandPrice?: unknown;
}

export interface StockChange {
  productId: string;
  quantity: number;
  before: number;
  after: number;
}

export interface Shortage {
  productId: string;
  name: string;
  requested: number;
  available: number;
}

export type ReservePlan =
  | { ok: true; decrements: StockChange[] }
  | { ok: false; shortages: Shortage[]; unavailable: string[] };

export interface PlatformReservation {
  platform: { productId: string; quantity: number }[];
  releasedAt: number | null;
}

// The stock a tracked product has, as a whole number of units. null when the product is not tracked.
export function trackedStock(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(MAX_STOCK, Math.max(0, Math.floor(value)));
}

// Sums repeated lines for the same product, so one product is checked once against its full quantity.
function totals(lines: StockLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.quantity) || line.quantity < 1) continue;
    out.set(line.productId, (out.get(line.productId) ?? 0) + line.quantity);
  }
  return out;
}

// Checks every tracked line of an order against platform stock. All lines pass or none does: when any line is short
// or a product is gone, nothing is decremented and every problem is returned so the customer can fix the bag at once.
// An exact match is allowed (stock 3, order 3 leaves 0). Untracked products are never blocked.
export function planReservation(lines: StockLine[], products: Map<string, ProductStock | undefined>): ReservePlan {
  const shortages: Shortage[] = [];
  const unavailable: string[] = [];
  const decrements: StockChange[] = [];
  for (const [productId, quantity] of totals(lines)) {
    const product = products.get(productId);
    if (!product) {
      unavailable.push(productId);
      continue;
    }
    const before = trackedStock(product.stock);
    if (before === null) continue;
    if (before < quantity) {
      shortages.push({ productId, name: String(product.productName ?? ""), requested: quantity, available: before });
      continue;
    }
    decrements.push({ productId, quantity, before, after: before - quantity });
  }
  if (shortages.length || unavailable.length) return { ok: false, shortages, unavailable };
  return { ok: true, decrements };
}

// The sentence a customer sees when stock blocks the order. One problem at a time keeps it short.
export function stockProblemMessage(problem: { shortages: Shortage[]; unavailable: string[] }): string {
  if (problem.unavailable.length) return "One of the products is no longer available. Remove it from your bag and try again.";
  const s = problem.shortages[0];
  const name = s?.name || "An item";
  if (!s || s.available <= 0) return `${name} is sold out. Remove it from your bag and try again.`;
  return `Only ${s.available} of ${name} left. Lower the quantity in your bag and try again.`;
}

// The reservation saved on the order. releasedAt starts null; a release sets it so stock is given back only once.
export function reservationFor(decrements: StockChange[]): PlatformReservation {
  return { platform: decrements.map((d) => ({ productId: d.productId, quantity: d.quantity })), releasedAt: null };
}

// Reads the platform part of an order's stockReservation defensively (the field is written by several routes).
export function platformLinesOf(reservation: unknown): StockLine[] {
  const r = (reservation ?? null) as { platform?: unknown } | null;
  if (!r || !Array.isArray(r.platform)) return [];
  return r.platform
    .map((x) => ({ productId: String((x as { productId?: unknown })?.productId ?? ""), quantity: Math.floor(Number((x as { quantity?: unknown })?.quantity) || 0) }))
    .filter((x) => /^[A-Za-z0-9_-]{1,140}$/.test(x.productId) && x.quantity > 0);
}

// Gives back the platform stock an order reserved. Runs once: when the reservation is already released (releasedAt set)
// the plan is empty. A product that no longer exists or is untracked is skipped, not re-created.
export function planRelease(reservation: unknown, products: Map<string, ProductStock | undefined>): StockChange[] {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || r.releasedAt) return [];
  const out: StockChange[] = [];
  for (const line of platformLinesOf(reservation)) {
    const product = products.get(line.productId);
    const before = product ? trackedStock(product.stock) : null;
    if (before === null) continue;
    out.push({ productId: line.productId, quantity: line.quantity, before, after: Math.min(MAX_STOCK, before + line.quantity) });
  }
  return out;
}

// A payment that is confirmed after its reservation was released (a failed attempt, then a successful retry) takes the
// stock again. It never goes below zero: a line that is short is clamped and reported, so the admin can review it.
export function planRetake(
  reservation: unknown,
  products: Map<string, ProductStock | undefined>,
): { decrements: StockChange[]; short: Shortage[] } {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || !r.releasedAt) return { decrements: [], short: [] };
  const decrements: StockChange[] = [];
  const short: Shortage[] = [];
  for (const line of platformLinesOf(reservation)) {
    const product = products.get(line.productId);
    const before = product ? trackedStock(product.stock) : null;
    if (before === null) continue;
    const take = Math.min(before, line.quantity);
    if (take < line.quantity) short.push({ productId: line.productId, name: String(product?.productName ?? ""), requested: line.quantity, available: before });
    decrements.push({ productId: line.productId, quantity: take, before, after: before - take });
  }
  return { decrements, short };
}
