// Stock and store-price rules for the inventory screen. Bounds match the server (lib/vendor/validation.ts). Pure.
import type { InventoryLine } from "./types";

export const STOCK_MIN = 0;
export const STOCK_MAX = 100_000;
export const LOW_STOCK_THRESHOLD = 3;
export const SAVE_BATCH_MAX = 100;

export const isLowStock = (stock: number): boolean => stock <= LOW_STOCK_THRESHOLD;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** A whole number from 0 to 100000. Digits only: no signs, decimals or spaces. */
export function parseStockInput(raw: string): Parsed<number> {
  const t = raw.trim();
  const n = Number(t);
  if (!/^\d+$/.test(t) || !Number.isSafeInteger(n) || n < STOCK_MIN || n > STOCK_MAX) {
    return { ok: false, error: `Stock must be a whole number from ${STOCK_MIN} to ${STOCK_MAX}.` };
  }
  return { ok: true, value: n };
}

/** Empty means no store price (the catalogue price applies). Otherwise a number greater than 0, to two decimals. */
export function parsePriceInput(raw: string): Parsed<number | null> {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!/^\d+(\.\d{1,2})?$/.test(t) || !Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "A store price must be more than ₹0, with at most two decimals." };
  }
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export interface StockEdit {
  productId: string;
  stock: string;
  isAvailable: boolean;
  price: string;
}

export interface SaveItem {
  productId: string;
  stock: number;
  isAvailable: boolean;
  /** Omitted when there is no store price (the server then clears any override). */
  unitPriceOverride?: number;
}

export type EditCheck = { ok: true; item: SaveItem } | { ok: false; errors: { stock?: string; price?: string } };

export function checkEdit(edit: StockEdit): EditCheck {
  const stock = parseStockInput(edit.stock);
  const price = parsePriceInput(edit.price);
  if (!stock.ok || !price.ok) {
    return {
      ok: false,
      errors: {
        ...(stock.ok ? {} : { stock: stock.error }),
        ...(price.ok ? {} : { price: price.error }),
      },
    };
  }
  const item: SaveItem = { productId: edit.productId, stock: stock.value, isAvailable: edit.isAvailable };
  if (price.value !== null) item.unitPriceOverride = price.value;
  return { ok: true, item };
}

/** Splits a save into requests of at most SAVE_BATCH_MAX lines. */
export function chunkForSave<T>(items: T[], size: number = SAVE_BATCH_MAX): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** The product lines (no option lines) of an inventory response. */
export function productLines(lines: InventoryLine[]): InventoryLine[] {
  return lines.filter((l) => l.variantId === null);
}
