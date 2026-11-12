// Stock checks for an order on this device, and the server's OUT_OF_STOCK detail. Pure.
import type { InventoryLine, OpsOrderItem } from "./types";

export const lineKey = (productId: string, variantId: string | null | undefined): string =>
  variantId ? `${productId}::${variantId}` : productId;

export interface NeededLine {
  key: string;
  productId: string;
  variantId: string | null;
  title: string;
  need: number;
}

export interface StockGap extends NeededLine {
  have: number;
}

/** Quantity needed per stock line (a product, or one option of a product). */
export function neededLines(items: OpsOrderItem[]): NeededLine[] {
  const byKey = new Map<string, NeededLine>();
  for (const it of items) {
    if (!it.productId || it.quantity <= 0) continue;
    const variantId = it.variantId ?? null;
    const key = lineKey(it.productId, variantId);
    const prev = byKey.get(key);
    byKey.set(key, {
      key,
      productId: it.productId,
      variantId,
      title: prev?.title || it.title || it.productId,
      need: (prev?.need ?? 0) + it.quantity,
    });
  }
  return [...byKey.values()];
}

/** Lines this device cannot cover from its inventory. A missing or unavailable line counts as 0 in stock. */
export function stockGaps(items: OpsOrderItem[], inventory: InventoryLine[]): StockGap[] {
  const byKey = new Map(inventory.map((l) => [lineKey(l.productId, l.variantId), l]));
  return neededLines(items)
    .map((n) => {
      const line = byKey.get(n.key);
      const have = line && line.isAvailable ? Math.max(0, Math.floor(line.stock)) : 0;
      return { ...n, have };
    })
    .filter((g) => g.have < g.need);
}

export function describeGap(gap: StockGap): string {
  return `${gap.title}: need ${gap.need}, have ${gap.have}`;
}

/** Parses `details.missing` from an OUT_OF_STOCK refusal. Anything malformed is dropped. */
export function parseMissing(details: unknown): StockGap[] {
  const raw = (details as { missing?: unknown } | null | undefined)?.missing;
  if (!Array.isArray(raw)) return [];
  const out: StockGap[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    if (typeof r.productId !== "string") continue;
    const variantId = typeof r.variantId === "string" && r.variantId ? r.variantId : null;
    out.push({
      key: lineKey(r.productId, variantId),
      productId: r.productId,
      variantId,
      title: typeof r.title === "string" && r.title ? r.title : r.productId,
      need: Number(r.need) || 0,
      have: Number(r.have) || 0,
    });
  }
  return out;
}
