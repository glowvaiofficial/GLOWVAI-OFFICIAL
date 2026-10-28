import { Product } from "@/types/product";
import { buildItemListSchema } from "./itemlist";
import { buildBreadcrumbSchema, BreadcrumbItem } from "./breadcrumb";
import { WEBSITE_ID } from "../entity-graph";
import { SITE_URL } from "@/lib/site-url";

export function buildCollectionPageSchema(
  name: string,
  urlPath: string,
  aboutText: string,
  products: Product[],
  breadcrumbItems: BreadcrumbItem[]
): Record<string, any> {
  const fullUrl = `${SITE_URL}${urlPath.startsWith("/") ? urlPath : "/" + urlPath}`;
  const itemList = buildItemListSchema(products, urlPath);
  const breadcrumbs = buildBreadcrumbSchema(breadcrumbItems, urlPath);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${fullUrl}#webpage`,
        "url": fullUrl,
        "name": name,
        "description": aboutText,
        "isPartOf": { "@id": WEBSITE_ID },
        "mainEntity": { "@id": `${fullUrl}#itemlist` },
        "breadcrumb": { "@id": `${fullUrl}#breadcrumb` },
        "inLanguage": "en-IN",
      },
      itemList,
      breadcrumbs,
    ],
  };
}
