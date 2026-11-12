// The canonical link to a product, shared by the product page's share button. Pure, so the browser and the tests build
// the same URL. The link opens the product page on a cold load (App.tsx reads ?product=).
export const CANONICAL_SHOP_URL = "https://glowvai.in/shop";

export function productShareUrl(productId: string): string {
  return `${CANONICAL_SHOP_URL}?product=${encodeURIComponent(productId)}`;
}
