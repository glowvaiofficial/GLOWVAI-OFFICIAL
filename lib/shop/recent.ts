// Recently viewed products, kept on the device. Only product ids are stored: no names, no personal data.
import { PRODUCT_ID_PATTERN } from "./wishlist";

export const RECENT_MAX = 20;

// The newest view first, no duplicates, never more than RECENT_MAX.
export function pushRecent(list: string[], productId: string, max = RECENT_MAX): string[] {
  if (!PRODUCT_ID_PATTERN.test(productId)) return cleanRecent(list, max);
  return [productId, ...cleanRecent(list, max).filter((id) => id !== productId)].slice(0, max);
}

// Reads a stored value back safely: anything that is not a list of valid ids is ignored.
export function cleanRecent(list: unknown, max = RECENT_MAX): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== "string" || !PRODUCT_ID_PATTERN.test(v) || out.includes(v)) continue;
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}
