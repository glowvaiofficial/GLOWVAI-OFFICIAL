import { FOUNDER_1_ID, ORG_ID } from "../entity-graph";
import { SITE_URL } from "@/lib/site-url";

export function buildArticleSchema(article: {
  title: string;
  description: string;
  urlPath: string;
  datePublished: string;
  dateModified?: string;
  authorId?: string;
  image?: string;
}): Record<string, any> {
  const fullUrl = `${SITE_URL}${article.urlPath.startsWith("/") ? article.urlPath : "/" + article.urlPath}`;
  const authorRef = article.authorId || FOUNDER_1_ID;

  return {
    "@type": "Article",
    "@id": `${fullUrl}#article`,
    "headline": article.title,
    "description": article.description,
    "url": fullUrl,
    "datePublished": article.datePublished,
    "dateModified": article.dateModified || article.datePublished,
    "author": { "@id": authorRef },
    "publisher": { "@id": ORG_ID },
    "mainEntityOfPage": { "@id": `${fullUrl}#webpage` },
  };
}
