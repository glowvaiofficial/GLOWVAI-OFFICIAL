// The link to one product, shared by the product page's share button. Pure, so the browser and the tests build the same
// URL. It points at the server-rendered product page (app/product/[slug]), whose metadata carries the product's own
// picture, name and price for link previews. Old /shop?product=ID links still open the product in the app (App.tsx).
export const CANONICAL_SITE_URL = "https://glowvai.in";

export function productShareUrl(productId: string): string {
  return `${CANONICAL_SITE_URL}/product/${encodeURIComponent(productId)}`;
}
