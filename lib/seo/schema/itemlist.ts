import { Product } from "@/types/product";
import { MAX_ITEMLIST_COUNT } from "@/config/seo";
import { SITE_URL } from "@/lib/site-url";

export function buildItemListSchema(
  products: Product[],
  currentUrlPath: string
): Record<string, any> {
  const fullUrl = `${SITE_URL}${currentUrlPath.startsWith("/") ? currentUrlPath : "/" + currentUrlPath}`;
  const cappedProducts = products.slice(0, MAX_ITEMLIST_COUNT);

  const elements = cappedProducts.map((p, idx) => ({
    "@type": "ListItem",
    "position": idx + 1,
    "url": `${SITE_URL}/product/${p.slug}`,
    "name": p.name,
  }));

  return {
    "@type": "ItemList",
    "@id": `${fullUrl}#itemlist`,
    "itemListElement": elements,
  };
}
