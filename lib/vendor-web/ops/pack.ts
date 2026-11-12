// Packing checklist. Every order line (product, or option of a product) must be ticked before "Mark packed" is enabled.
import type { OpsOrderItem } from "./types";
import { lineKey } from "./stock";

export interface PackLine {
  key: string;
  productId: string;
  title: string;
  variantLabel: string | null;
  quantity: number;
}

export function packLines(items: OpsOrderItem[]): PackLine[] {
  const seen = new Map<string, PackLine>();
  for (const it of items) {
    if (!it.productId) continue;
    const key = lineKey(it.productId, it.variantId);
    if (seen.has(key)) continue;
    seen.set(key, { key, productId: it.productId, title: it.title || it.productId, variantLabel: it.variantLabel, quantity: it.quantity });
  }
  return [...seen.values()];
}

/** True only when there is at least one line and every line is ticked. */
export function allTicked(lines: PackLine[], ticked: ReadonlySet<string>): boolean {
  return lines.length > 0 && lines.every((l) => ticked.has(l.key));
}

/** The body the server expects: every product in the order, once each. Sent only when allTicked. */
export function checkedProductIds(lines: PackLine[]): string[] {
  return [...new Set(lines.map((l) => l.productId))];
}
