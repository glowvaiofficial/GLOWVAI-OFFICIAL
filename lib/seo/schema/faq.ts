import { SITE_URL } from "@/lib/site-url";

export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Builds FAQPage JSON-LD schema for pages with visible FAQs.
 * Google limits FAQ rich results to authoritative sites; markup is preserved for machine understanding.
 */
export function buildFAQSchema(faqs: FAQItem[], urlPath: string = ""): Record<string, any> {
  const fullUrl = `${SITE_URL}${urlPath.startsWith("/") ? urlPath : "/" + urlPath}`;

  return {
    "@type": "FAQPage",
    "@id": `${fullUrl}#faq`,
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}
