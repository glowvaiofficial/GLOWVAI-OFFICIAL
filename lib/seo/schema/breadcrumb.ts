import { SITE_URL } from "@/lib/site-url";

export interface BreadcrumbItem {
  name: string;
  urlPath?: string;
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  currentUrlPath: string
): Record<string, any> {
  const fullUrl = `${SITE_URL}${currentUrlPath.startsWith("/") ? currentUrlPath : "/" + currentUrlPath}`;

  const listElements = items.map((item, index) => {
    const element: Record<string, any> = {
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
    };

    if (item.urlPath) {
      element["item"] = `${SITE_URL}${item.urlPath.startsWith("/") ? item.urlPath : "/" + item.urlPath}`;
    } else if (index < items.length - 1) {
      element["item"] = fullUrl;
    }

    return element;
  });

  return {
    "@type": "BreadcrumbList",
    "@id": `${fullUrl}#breadcrumb`,
    "itemListElement": listElements,
  };
}
