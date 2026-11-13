// Flash sales: a timed discount on chosen products with a limit on units, shared by everyone, and a per-customer limit.
// Set by the admin (Firestore collection "flashSales"). Pure: no Firebase, so the quote, the order and the tests use the
// same rules. A unit beyond the sale limit is charged at the normal price.

export interface FlashSale {
  id: string;
  name: string;
  productIds: string[];
  discountPercent: number;
  startsAt: number;
  endsAt: number;
  // Units the whole sale may sell. Null = no limit.
  stockCap: number | null;
  perCustomerLimit: number;
  enabled: boolean;
}

export const FLASH_LIMITS = { maxProducts: 50, discountMin: 1, discountMax: 80, perCustomerMax: 10, stockCapMax: 100000 } as const;

const ID = /^[a-z0-9-]{8,40}$/;
const int = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

// A stored sale, or null when anything is missing or out of range (such a sale is never applied).
export function readFlashSale(id: string, raw: unknown): FlashSale | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (!ID.test(id)) return null;
  const name = typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= 60 ? d.name : null;
  const productIds = Array.isArray(d.productIds) && d.productIds.length > 0 && d.productIds.length <= FLASH_LIMITS.maxProducts && d.productIds.every((p) => typeof p === "string" && p.length > 0 && p.length <= 128) ? (d.productIds as string[]) : null;
  const discountPercent = int(d.discountPercent, FLASH_LIMITS.discountMin, FLASH_LIMITS.discountMax);
  const startsAt = typeof d.startsAt === "number" && d.startsAt > 0 ? d.startsAt : null;
  const endsAt = typeof d.endsAt === "number" && d.endsAt > 0 ? d.endsAt : null;
  const stockCap = d.stockCap === null || d.stockCap === undefined ? null : int(d.stockCap, 1, FLASH_LIMITS.stockCapMax);
  const perCustomerLimit = int(d.perCustomerLimit, 1, FLASH_LIMITS.perCustomerMax);
  if (!name || !productIds || discountPercent === null || startsAt === null || endsAt === null || perCustomerLimit === null) return null;
  if (stockCap === undefined || (stockCap === null && d.stockCap !== null && d.stockCap !== undefined)) return null;
  if (endsAt <= startsAt) return null;
  return { id, name, productIds: [...new Set(productIds)], discountPercent, startsAt, endsAt, stockCap, perCustomerLimit, enabled: d.enabled === true };
}

// The live sale for a product at this moment, or null.
export function liveSaleFor(sales: FlashSale[], productId: string, now: number): FlashSale | null {
  return sales.find((s) => s.enabled && now >= s.startsAt && now < s.endsAt && s.productIds.includes(productId)) ?? null;
}

// The sale price per unit, rounded down to whole rupees, never below 1.
export function saleUnitPrice(unitPrice: number, discountPercent: number): number {
  return Math.max(1, Math.floor((unitPrice * (100 - discountPercent)) / 100));
}

export interface FlashLinePricing {
  totalPrice: number;
  flashUnits: number;
  flashUnitPrice: number | null;
}

// Prices one bag line with the sale: as many units as the sale and the customer still allow get the sale price, the
// rest the normal price.
export function priceFlashLine(input: {
  unitPrice: number;
  quantity: number;
  sale: FlashSale | null;
  soldSoFar: number;
  customerSoFar: number;
}): FlashLinePricing {
  const { unitPrice, quantity, sale } = input;
  if (!sale) return { totalPrice: unitPrice * quantity, flashUnits: 0, flashUnitPrice: null };
  const saleRemaining = sale.stockCap === null ? Number.POSITIVE_INFINITY : Math.max(0, sale.stockCap - input.soldSoFar);
  const customerRemaining = Math.max(0, sale.perCustomerLimit - input.customerSoFar);
  const flashUnits = Math.max(0, Math.min(quantity, saleRemaining, customerRemaining));
  const flashUnitPrice = saleUnitPrice(unitPrice, sale.discountPercent);
  return {
    totalPrice: flashUnits * flashUnitPrice + (quantity - flashUnits) * unitPrice,
    flashUnits,
    flashUnitPrice: flashUnits > 0 ? flashUnitPrice : null,
  };
}
