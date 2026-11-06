// "Buy it again": splits the lines of a past order into what can be bought now and what cannot. Pure: the reorder route
// reads the order and the products, builds CatalogView rows and calls splitReorder. Nothing is silently dropped.
import { trackedStock } from "./platformStock";

export const REORDER_MAX_LINES = 20;
export const REORDER_MAX_QTY = 10;

export interface ReorderLine {
  productId: string;
  quantity: number;
}

// The live view of one product: what the customer would pay today and what is in stock.
export interface CatalogView {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  published: boolean;
  unitPrice: number;
  originalPrice: number;
  // null when the product is not stock-tracked (sold without a stock limit).
  stock: number | null;
}

export interface ReorderAvailable {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number;
  previousUnitPrice: number;
  requested: number;
  quantity: number;
  // Set when the shop has fewer units than the order had. The customer gets what is left.
  limitedBy: number | null;
}

export interface ReorderUnavailable {
  productId: string;
  name: string;
  requested: number;
  reason: "NOT_AVAILABLE" | "OUT_OF_STOCK" | "NO_PRICE";
}

const REASON_NAME = { NOT_AVAILABLE: "no longer sold", OUT_OF_STOCK: "out of stock", NO_PRICE: "no price set" } as const;
export const reorderReasonText = (reason: ReorderUnavailable["reason"]): string => REASON_NAME[reason];

// Builds the live view from a products/{id} document. Missing or unpublished products are not available.
export function catalogViewOf(productId: string, data: Record<string, unknown> | undefined): CatalogView | null {
  if (!data) return null;
  const unitPrice = Math.round(Number(data.brandPrice) || 0);
  const discount = Math.min(100, Math.max(0, Number(data.brandDiscount) || 0));
  const pictures = Array.isArray(data.pictures) ? data.pictures : [];
  return {
    productId,
    name: String(data.productName ?? ""),
    brand: String(data.brandName ?? ""),
    imageUrl: typeof pictures[0] === "string" ? pictures[0] : "",
    published: data.status === "PUBLISHED",
    unitPrice,
    originalPrice: discount > 0 && unitPrice > 0 ? Math.round(unitPrice / (1 - discount / 100)) : unitPrice,
    stock: trackedStock(data.stock),
  };
}

// Sums repeated lines for one product and keeps only lines with a usable id and quantity.
export function mergeReorderLines(lines: ReorderLine[]): ReorderLine[] {
  const totals = new Map<string, number>();
  for (const l of lines) {
    if (!/^[A-Za-z0-9_-]{1,140}$/.test(l.productId) || !Number.isInteger(l.quantity) || l.quantity < 1) continue;
    totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.quantity);
  }
  return [...totals].map(([productId, quantity]) => ({ productId, quantity }));
}

// `previousPrices` is the unit price the customer paid in the past order, so a price change can be shown.
export function splitReorder(
  lines: ReorderLine[],
  catalog: Map<string, CatalogView | null | undefined>,
  previousPrices: Map<string, number> = new Map(),
  maxQty = REORDER_MAX_QTY,
): { available: ReorderAvailable[]; unavailable: ReorderUnavailable[] } {
  const available: ReorderAvailable[] = [];
  const unavailable: ReorderUnavailable[] = [];
  for (const line of mergeReorderLines(lines)) {
    const p = catalog.get(line.productId);
    const name = p?.name ?? "";
    if (!p || !p.published) {
      unavailable.push({ productId: line.productId, name, requested: line.quantity, reason: "NOT_AVAILABLE" });
      continue;
    }
    if (!(p.unitPrice > 0)) {
      unavailable.push({ productId: line.productId, name, requested: line.quantity, reason: "NO_PRICE" });
      continue;
    }
    if (p.stock !== null && p.stock <= 0) {
      unavailable.push({ productId: line.productId, name, requested: line.quantity, reason: "OUT_OF_STOCK" });
      continue;
    }
    const cap = Math.min(maxQty, p.stock ?? Number.POSITIVE_INFINITY);
    const quantity = Math.min(line.quantity, cap);
    available.push({
      productId: p.productId,
      name: p.name,
      brand: p.brand,
      imageUrl: p.imageUrl,
      unitPrice: p.unitPrice,
      originalPrice: p.originalPrice,
      previousUnitPrice: previousPrices.get(line.productId) ?? p.unitPrice,
      requested: line.quantity,
      quantity,
      limitedBy: quantity < line.quantity && p.stock !== null ? p.stock : null,
    });
  }
  return { available, unavailable };
}
