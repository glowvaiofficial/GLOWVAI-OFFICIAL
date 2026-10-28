import { getRenderableEntityConfig, entityConfig } from "@/config/entity";
import { buildFAQSchema } from "@/lib/seo/schema/faq";
import { faqItems } from "@/config/content";
import { SITE_URL } from "@/lib/site-url";

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const FOUNDER_1_ID = `${SITE_URL}/our-story#sardhar-musthafa`;
export const FOUNDER_2_ID = `${SITE_URL}/our-story#rahimath`;
export const FOUNDER_3_ID = `${SITE_URL}/our-story#nalla-satvik`;

export function buildOrganizationNode(): Record<string, any> {
  const entity = getRenderableEntityConfig();

  const node: Record<string, any> = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": entity.name,
    "alternateName": entity.alternateName,
    "url": `${entity.url}/`,
    "logo": {
      "@type": "ImageObject",
      "url": entity.logoPng512Url,
      "width": 512,
      "height": 512,
    },
    "image": entity.ogImageUrl,
    "description": entity.description,
    "slogan": entity.slogan,
    "email": entity.email,
    "telephone": entity.telephone,
    "areaServed": entity.areaServed,
    "founder": [
      { "@id": FOUNDER_1_ID },
      { "@id": FOUNDER_2_ID },
      { "@id": FOUNDER_3_ID },
    ],
    "sameAs": entity.sameAs,
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": entity.email,
        "telephone": entity.telephone,
        "areaServed": entity.areaServed,
        "availableLanguage": ["English"],
      },
    ],
  };

  if (entity.legalName) node["legalName"] = entity.legalName;
  if (entity.foundingDate) node["foundingDate"] = entity.foundingDate;
  if (entity.foundingLocation) {
    node["foundingLocation"] = {
      "@type": "Place",
      "name": entity.foundingLocation,
    };
  }
  if (entity.address) node["address"] = entity.address;
  if (entity.taxID) node["vatID"] = entity.taxID;

  return node;
}

export function buildWebSiteNode(): Record<string, any> {
  const entity = getRenderableEntityConfig();
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    "url": `${entity.url}/`,
    "name": entity.name,
    "publisher": { "@id": ORG_ID },
    "inLanguage": "en-IN",
  };
}

export function buildFounderNodes(): Record<string, any>[] {
  const entity = getRenderableEntityConfig();
  return entity.founders.map((f) => {
    const founderNode: Record<string, any> = {
      "@type": "Person",
      "@id": f.anchorUrl,
      "name": f.name,
      "jobTitle": f.jobTitle,
      "worksFor": { "@id": ORG_ID },
      "image": f.image,
    };

    if (f.sameAs && f.sameAs.length > 0) {
      founderNode["sameAs"] = f.sameAs;
    }

    return founderNode;
  });
}

export function buildHomeGraph(): Record<string, any> {
  const routineSlugs = [
    "velvet-cloud-cica-cleanser",
    "clarity-pop-niacinamide-serum",
    "dew-barrier-daily-hydrator",
    "sun-shield-invisible-fluid-spf50",
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationNode(),
      buildWebSiteNode(),
      buildFAQSchema(faqItems, "/"),
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#routine`,
        "name": "Starter routine",
        "itemListElement": routineSlugs.map((slug, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `${SITE_URL}/product/${slug}`,
        })),
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        "url": `${SITE_URL}/`,
        "name": "GLOW VAI | Free AI Skin Scan and 15-Min Skincare Delivery",
        "description": entityConfig.brand.description,
        "publisher": { "@id": ORG_ID },
        "inLanguage": "en-IN",
      },
    ],
  };
}

export function buildAboutPageGraph(): Record<string, any> {
  const founders = buildFounderNodes();
  const org = buildOrganizationNode();
  
  const faqNode = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/our-story#faq`,
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is GLOW VAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "GLOW VAI is an Indian skincare retail brand offering a free face scan and WhatsApp ordering.",
        },
      },
      {
        "@type": "Question",
        "name": "Who founded GLOW VAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "GLOW VAI was founded by SK Sardar Musthafa (Founder), Rehmit (Market Explorer), and Nalla Satvik (Co-Founder & Technical Lead) in Andhra Pradesh, India.",
        },
      },
      {
        "@type": "Question",
        "name": "Does GLOW VAI make its own products?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. GLOW VAI is an independent retailer and does not manufacture the products it sells.",
        },
      },
      {
        "@type": "Question",
        "name": "How do I contact GLOW VAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can reach GLOW VAI by email at contact@glowvai.in or by telephone and WhatsApp at +91 89778 55998.",
        },
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/our-story#aboutpage`,
        "url": `${SITE_URL}/our-story`,
        "name": "Our Story | GLOW VAI",
        "description": entityConfig.brand.description,
        "mainEntity": { "@id": ORG_ID },
        "publisher": { "@id": ORG_ID },
        "inLanguage": "en-IN",
      },
      org,
      ...founders,
      faqNode,
    ],
  };
}

export function buildContactPageGraph(): Record<string, any> {
  const entity = getRenderableEntityConfig();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${SITE_URL}/contact#contactpage`,
        "url": `${SITE_URL}/contact`,
        "name": "Contact Us | GLOW VAI",
        "description": "Contact GLOW VAI for customer support, skincare order inquiries, and assistance.",
        "mainEntity": { "@id": ORG_ID },
        "publisher": { "@id": ORG_ID },
        "inLanguage": "en-IN",
      },
      {
        "@type": "ContactPoint",
        "@id": `${SITE_URL}/contact#contactpoint`,
        "contactType": "customer support",
        "email": entity.email,
        "telephone": entity.telephone,
        "areaServed": entity.areaServed,
        "availableLanguage": ["English"],
      },
    ],
  };
}

export function buildWebPageGraph(urlPath: string, name: string, description?: string): Record<string, any> {
  const fullUrl = `${SITE_URL}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${fullUrl}#webpage`,
        "url": fullUrl,
        "name": name,
        "description": description || entityConfig.brand.description,
        "publisher": { "@id": ORG_ID },
        "inLanguage": "en-IN",
      },
    ],
  };
}

export function buildProductGraph(product: {
  name: string;
  brandName: string; // "Minimalist" or "The Derma Co"
  description: string;
  image: string;
  sku?: string;
  price: string | number;
  currency?: string;
  urlPath: string;
}): Record<string, any> {
  const fullUrl = `${SITE_URL}${product.urlPath.startsWith('/') ? product.urlPath : '/' + product.urlPath}`;
  
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${fullUrl}#product`,
        "name": product.name,
        "description": product.description,
        "image": product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`,
        "brand": {
          "@type": "Brand",
          "name": product.brandName,
        },
        "offers": {
          "@type": "Offer",
          "url": fullUrl,
          "priceCurrency": product.currency || "INR",
          "price": String(product.price),
          "availability": "https://schema.org/InStock",
          "seller": { "@id": ORG_ID },
        },
      },
      {
        "@type": "WebPage",
        "@id": `${fullUrl}#webpage`,
        "url": fullUrl,
        "name": `${product.name} | GLOW VAI`,
        "publisher": { "@id": ORG_ID },
      },
    ],
  };
}

export function buildArticleGraph(article: {
  title: string;
  description: string;
  urlPath: string;
  datePublished: string;
  authorId?: string; // FOUNDER_1_ID, FOUNDER_2_ID, or FOUNDER_3_ID
}): Record<string, any> {
  const fullUrl = `${SITE_URL}${article.urlPath.startsWith('/') ? article.urlPath : '/' + article.urlPath}`;
  const authorRef = article.authorId || FOUNDER_1_ID;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${fullUrl}#article`,
        "headline": article.title,
        "description": article.description,
        "url": fullUrl,
        "datePublished": article.datePublished,
        "author": { "@id": authorRef },
        "publisher": { "@id": ORG_ID },
        "mainEntityOfPage": { "@id": `${fullUrl}#webpage` },
      },
      {
        "@type": "WebPage",
        "@id": `${fullUrl}#webpage`,
        "url": fullUrl,
        "name": article.title,
        "publisher": { "@id": ORG_ID },
      },
    ],
  };
}
