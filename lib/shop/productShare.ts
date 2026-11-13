// The link to one product, shared by the product page's share button. Pure, so the browser and the tests build the same
// URL. It points at the server-rendered product page (app/product/[slug]), whose metadata carries the product's own
// picture, name and price for link previews. Old /shop?product=ID links still open the product in the app (App.tsx).
export const CANONICAL_SITE_URL = "https://glowvai.in";

export function productShareUrl(productId: string): string {
  return `${CANONICAL_SITE_URL}/product/${encodeURIComponent(productId)}`;
}

// Old links were /shop?product=<id>. Returns the product page they should go to (middleware.ts redirects there), or null
// when the request is not one of those links. A request marked src=share is the product page's own hand-off to the
// shop app, so it is not redirected.
export function legacyShopProductPath(params: URLSearchParams): string | null {
  const id = params.get("product");
  if (!id || !/^[A-Za-z0-9_-]{1,140}$/.test(id) || params.get("src") === "share") return null;
  return `/product/${encodeURIComponent(id)}`;
}
