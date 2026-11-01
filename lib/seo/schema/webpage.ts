import { WEBSITE_ID, ORG_ID } from "../entity-graph";
import { SITE_URL } from "@/lib/site-url";

export function buildWebPageSchema(
  urlPath: string,
  name: string,
  description?: string,
  primaryImage?: string
): Record<string, any> {
  const fullUrl = `${SITE_URL}${urlPath.startsWith("/") ? urlPath : "/" + urlPath}`;

  const node: Record<string, any> = {
    "@type": "WebPage",
    "@id": `${fullUrl}#webpage`,
    "url": fullUrl,
    "name": name,
    "isPartOf": { "@id": WEBSITE_ID },
    "publisher": { "@id": ORG_ID },
    "inLanguage": "en-IN",
  };

  if (description) node["description"] = description;
  if (primaryImage) {
    node["primaryImageOfPage"] = primaryImage.startsWith("http")
      ? primaryImage
      : `${SITE_URL}${primaryImage.startsWith("/") ? "" : "/"}${primaryImage}`;
  }

  return node;
}
