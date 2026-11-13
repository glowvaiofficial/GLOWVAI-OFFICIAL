// The product share link and the rules that go with it. Pure (no server or browser APIs), so the shop app, the product
// page and the tests all use the same URL.
//
// Share links point at /product/<key>. The key is the catalog slug for the static product pages, or the Firestore
// product id for live products. Link crawlers (WhatsApp, Slack, iMessage) read only the server-rendered HTML of that
// page, so its metadata carries the product's own title, description and picture.
export const SHARE_ORIGIN = "https://glowvai.in";

const KEY_RE = /^[A-Za-z0-9_-]{1,140}$/;

export function productSharePath(key: string): string {
  return `/product/${encodeURIComponent(key)}`;
}

export function productShareUrl(key: string): string {
  return `${SHARE_ORIGIN}${productSharePath(key)}`;
}

// Old links were /shop?product=<id>. Returns the product page they should go to, or null when the request is not one of
// those links. A request marked src=share is the product page's own hand-off to the shop app, so it is not redirected.
export function legacyShopProductPath(params: URLSearchParams): string | null {
  const id = params.get("product");
  if (!id || !KEY_RE.test(id) || params.get("src") === "share") return null;
  return productSharePath(id);
}
