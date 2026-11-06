// Recently viewed products on this device. Only product ids are kept (no names, no personal data), at most 20.
import { cleanRecent, pushRecent } from '../../../../lib/shop/recent';

const KEY = 'glowvai_recent_products_v1';

// Storage can be blocked (private mode): every read and write is guarded and falls back to nothing.
export function readRecentlyViewed(): string[] {
  try {
    return cleanRecent(JSON.parse(window.localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function rememberProductViewed(productId: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pushRecent(readRecentlyViewed(), productId)));
  } catch {
    // Storage blocked or full: nothing is remembered.
  }
}
