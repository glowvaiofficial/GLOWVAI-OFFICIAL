import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getProducts } from "@/lib/catalog";
import { journalArticles } from "@/config/journal";
import { SITE_URL } from "@/lib/site-url";
import { statSync } from "fs";
import path from "path";

export const dynamic = "force-static";

function sourceDate(relPath: string): Date {
  try {
    return statSync(path.join(process.cwd(), relPath)).mtime;
  } catch {
    return new Date("2026-10-09T00:00:00.000Z");
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: sourceDate("app/page.tsx"), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/shop`, lastModified: sourceDate("app/shop/page.tsx"), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/face-analysis`, lastModified: sourceDate("app/face-analysis/page.tsx"), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/our-story`, lastModified: sourceDate("app/our-story/page.tsx"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: sourceDate("app/contact/page.tsx"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/referral`, lastModified: sourceDate("app/referral/page.tsx"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: sourceDate("app/faq/page.tsx"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/returns`, lastModified: sourceDate("app/returns/page.tsx"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/delivery`, lastModified: sourceDate("app/delivery/page.tsx"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/help`, lastModified: sourceDate("app/help/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/track-order`, lastModified: sourceDate("app/track-order/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/careers`, lastModified: sourceDate("app/careers/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/partners`, lastModified: sourceDate("app/partners/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/grievance`, lastModified: sourceDate("app/grievance/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/press`, lastModified: sourceDate("app/press/page.tsx"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/careers/marketing-sales-revenue`, lastModified: sourceDate("app/careers/[area]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/careers/operations-delivery`, lastModified: sourceDate("app/careers/[area]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/careers/engineering-product`, lastModified: sourceDate("app/careers/[area]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/careers/customer-care`, lastModified: sourceDate("app/careers/[area]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/help/orders`, lastModified: sourceDate("app/help/[topic]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/help/payments`, lastModified: sourceDate("app/help/[topic]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/help/face-scan`, lastModified: sourceDate("app/help/[topic]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/partners/stores`, lastModified: sourceDate("app/partners/[kind]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/partners/brands`, lastModified: sourceDate("app/partners/[kind]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/partners/rider`, lastModified: sourceDate("app/partners/[kind]/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/press/brand-kit`, lastModified: sourceDate("app/press/brand-kit/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/accessibility`, lastModified: sourceDate("app/accessibility/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/site-map`, lastModified: sourceDate("app/site-map/page.tsx"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/concerns/breakouts-and-pores`, lastModified: sourceDate("config/concerns.ts"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/concerns/dullness-and-glow`, lastModified: sourceDate("config/concerns.ts"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/concerns/dehydration`, lastModified: sourceDate("config/concerns.ts"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/concerns/dark-spots`, lastModified: sourceDate("config/concerns.ts"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/concerns/sun-protection`, lastModified: sourceDate("config/concerns.ts"), changeFrequency: "weekly", priority: 0.8 },
    ...(journalArticles.filter((a) => a.status === "published").length >= 3
      ? [{ url: `${SITE_URL}/journal`, lastModified: sourceDate("app/journal/page.tsx"), changeFrequency: "weekly" as const, priority: 0.8 }]
      : []),
    {
      url: `${SITE_URL}/journal/how-to-read-a-skincare-label`,
      lastModified: sourceDate("config/journal.ts"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = getProducts().map((product) => ({
    url: `${SITE_URL}/product/${product.slug}`,
    lastModified: sourceDate("config/products.ts"),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const legalRoutes: MetadataRoute.Sitemap = siteConfig.LEGAL_APPROVED
    ? [
        { url: `${SITE_URL}/privacy`, lastModified: sourceDate("app/privacy/page.tsx"), changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terms`, lastModified: sourceDate("app/terms/page.tsx"), changeFrequency: "yearly", priority: 0.3 },
      ]
    : [];

  return [...coreRoutes, ...productRoutes, ...legalRoutes];
}
