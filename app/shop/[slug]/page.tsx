import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { filterProducts, computeDiscountPercent } from "@/lib/catalog";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { seoCategoryCopy } from "@/config/seo-copy";
import { SITE_URL } from "@/lib/site-url";
import { Product } from "@/config/products";

export const dynamic = "force-static";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return [
    { slug: "minimalist" },
    { slug: "the-derma-co" },
    { slug: "face-serums" },
    { slug: "face-washes" },
    { slug: "sunscreen" },
    { slug: "moisturizers" },
  ];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const seo = seoCategoryCopy[slug];

  if (!seo) {
    return {
      title: `Category Not Found | ${BRAND_NAME}`,
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${SITE_URL}/shop/${slug}`;

  return {
    title: seo.title.replace(` | ${BRAND_NAME}`, ""), // avoid double brand suffix with root template
    description: seo.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seo.title,
      description: seo.metaDescription,
      url: canonicalUrl,
      type: "website",
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.metaDescription,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

function getFilteredProductsForSlug(slug: string): Product[] {
  if (slug === "minimalist") {
    return filterProducts({ query: "minimalist" }).concat(
      filterProducts().filter((p) => p.marketerName.toLowerCase().includes("minimalist"))
    );
  }
  if (slug === "the-derma-co") {
    return filterProducts({ query: "derma" }).concat(
      filterProducts().filter((p) => p.marketerName.toLowerCase().includes("derma"))
    );
  }
  if (slug === "face-serums") {
    return filterProducts({ category: "serum" });
  }
  if (slug === "face-washes") {
    return filterProducts({ category: "cleanser" });
  }
  if (slug === "sunscreen") {
    return filterProducts({ category: "sunscreen" });
  }
  if (slug === "moisturizers") {
    return filterProducts({ category: "moisturiser" });
  }
  return filterProducts();
}

import { buildCollectionPageSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const seo = seoCategoryCopy[slug];

  if (!seo) {
    notFound();
  }

  const products = getFilteredProductsForSlug(slug);

  const breadcrumbs = [
    { name: "Home", urlPath: "/" },
    { name: "Shop", urlPath: "/shop" },
    { name: seo.h1 },
  ];

  const collectionGraph = buildCollectionPageSchema(
    seo.h1,
    `/shop/${slug}`,
    seo.intro,
    products as any,
    breadcrumbs
  );

  return (
    <>
      <JsonLd data={collectionGraph} />

      <main className="min-h-screen bg-sand/30 py-12 sm:py-16">
        <Container>
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-ink/60">
            <Link href="/" className="hover:text-brand transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-brand transition-colors">
              Shop
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">{seo.h1}</span>
          </nav>

          {/* Heading and Intro */}
          <div className="max-w-3xl mb-12 space-y-4">
            <Badge variant="brand" size="md">
              Collection
            </Badge>
            <h1 className="font-display text-h1-hero text-ink">{seo.h1}</h1>
            <p className="text-body-lg text-ink/80 leading-relaxed">{seo.intro}</p>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-ink/10 text-center space-y-4">
              <p className="text-ink/70">No products found in this category currently.</p>
              <Link href="/shop" className="inline-block text-brand font-semibold hover:underline">
                View all products &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {products.map((product) => {
                const mainImage = product.images[0]
                  ? getAssetPath(product.images[0])
                  : "/images/products/placeholder.png";
                const discount = computeDiscountPercent(product.price, product.mrp);

                return (
                  <article
                    key={product.id}
                    className="bg-white rounded-2xl border border-ink/10 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square bg-sand/50 overflow-hidden">
                        <Image
                          src={mainImage}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        {discount > 0 && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="brand" size="sm">
                              {discount}% OFF
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="p-6 space-y-3">
                        <h2 className="font-display text-h3-card text-ink hover:text-brand transition-colors">
                          <Link href={`/product/${product.slug}`}>{product.name}</Link>
                        </h2>
                        <p className="text-sm text-ink/70 line-clamp-2">{product.tagline}</p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-ink/5">
                      <div>
                        <span className="font-display text-lg font-bold text-ink">
                          {formatPrice(product.price)}
                        </span>
                        {product.mrp > product.price && (
                          <span className="ml-2 text-sm text-ink/40 line-through">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-sm font-semibold text-brand hover:text-brand-dark transition-colors"
                      >
                        View Details &rarr;
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Container>
      </main>
    </>
  );
}
