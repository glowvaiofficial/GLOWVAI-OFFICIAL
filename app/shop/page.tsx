import React from "react";
import { Metadata } from "next";
import { getProducts } from "@/lib/catalog";
import { siteConfig } from "@/config/site";
import { ShopCatalogView } from "@/components/shop/ShopCatalogView";
import { JsonLd } from "@/components/seo/JsonLd";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Shop Dermaceutical Skincare",
  description: "Explore clean, transparent skincare formulas built for Indian weather. Fast delivery to your doorstep.",
  alternates: {
    canonical: `${siteConfig.url}/shop`,
  },
  openGraph: {
    title: "Shop Dermaceutical Skincare | GLOW VAI",
    description: "Explore clean, transparent skincare formulas built for Indian weather. Fast delivery to your doorstep.",
    url: `${siteConfig.url}/shop`,
    images: [{ url: `${siteConfig.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Dermaceutical Skincare | GLOW VAI",
    description: "Explore clean, transparent skincare formulas built for Indian weather. Fast delivery to your doorstep.",
    images: [`${siteConfig.url}/opengraph-image`],
  },
};

export default function ShopPage() {
  const products = getProducts();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: p.name,
        url: `${siteConfig.url}/product/${p.slug}`,
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <ShopCatalogView allProducts={products} />
    </>
  );
}
