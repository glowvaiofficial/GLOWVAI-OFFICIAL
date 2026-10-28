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

  const categoryRoutes: MetadataRoute.Sitemap = [
    "minimalist",
    "the-derma-co",
    "face-serums",
    "face-washes",
    "sunscreen",
    "moisturizers",
  ].map((slug) => ({
    url: `${SITE_URL}/shop/${slug}`,
    lastModified: sourceDate("app/shop/[slug]/page.tsx"),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

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

  return [...coreRoutes, ...categoryRoutes, ...productRoutes, ...legalRoutes];
}
