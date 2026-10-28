import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { getProducts, getProductBySlug, getRelatedProducts, computeDiscountPercent } from "@/lib/catalog";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { testimonials } from "@/config/testimonials";
import { Camera, Lock, ShieldCheck, MapPin, CheckCircle2, ChevronRight } from "lucide-react";

import { SITE_URL, getAbsoluteUrl } from "@/lib/site-url";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const products = getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};

  const titleClean = (product.seo.title || product.name).replace(/\s*\|\s*GLOW VAI/gi, "");
  const canonicalUrl = getAbsoluteUrl(`/product/${product.slug}`);
  const ogImageUrl = product.images[0] ? getAbsoluteUrl(product.images[0]) : `${SITE_URL}/opengraph-image`;

  return {
    title: titleClean,
    description: product.seo.description || product.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title: `${titleClean} | ${BRAND_NAME}`,
      description: product.seo.description || product.description,
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${titleClean} | ${BRAND_NAME}`,
      description: product.seo.description || product.description,
      images: [ogImageUrl],
    },
  };
}

import { buildProductSchema, buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product.slug, 3);
  const discount = computeDiscountPercent(product.price, product.mrp);

  const breadcrumbs = [
    { name: "Home", urlPath: "/" },
    { name: "Shop", urlPath: "/shop" },
    { name: product.name },
  ];

  const productGraph = {
    "@context": "https://schema.org",
    "@graph": [
      buildProductSchema(product, []),
      buildBreadcrumbSchema(breadcrumbs, `/product/${product.slug}`),
    ],
  };

  return (
    <div className="bg-white py-10 sm:py-16 text-ink min-h-screen">
      <CartDrawer />
      <JsonLd data={productGraph} />

      <Container>
        
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-brand transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/shop" className="hover:text-brand transition-colors">
                Shop
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-ink truncate max-w-[180px]">{product.name}</li>
          </ol>
        </nav>

        {/* Desktop 7/5 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Gallery (7 cols desktop) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-skymist border border-ink/10 shadow-lg">
              <Image
                src={getAssetPath(product.images[0] || "/images/hero/product.webp")}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-ink text-white font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden bg-skymist border-2 border-brand shrink-0 cursor-pointer"
                  >
                    <Image src={getAssetPath(img)} alt={`${product.name} view ${idx + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* "Match with your scan" Strip */}
            <div className="bg-skymist/50 rounded-3xl p-6 border border-brand/15 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-brand uppercase tracking-wider block">
                  Custom Match
                </span>
                <h3 className="font-display font-bold text-base text-ink">
                  Check if this formula suits your skin
                </h3>
                <p className="text-xs text-ink-muted">
                  Take a 30-second camera scan to match hydration and barrier scores.
                </p>
              </div>
              <Link href="/face-analysis" className="shrink-0">
                <Button variant="primary" size="md" className="gap-2  text-button-label">
                  <Camera className="w-4 h-4 text-ink shrink-0" />
                  <span>Start free scan</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Sticky Buy Box (5 cols desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-[96px] space-y-6">
            <ProductBuyBox product={product} />
          </div>

        </div>

        {/* Product Details Accordion & INCI Labeling */}
        <div className="mt-16 sm:mt-24 border-t border-ink/10 pt-12 space-y-8 max-w-4xl mx-auto">
          <h2 className="font-display font-bold text-2xl text-ink text-center sm:text-left">
            Formula & Regulatory Details
          </h2>

          <div className="space-y-4">
            {/* Description */}
            <div className="p-6 rounded-3xl bg-skymist/30 border border-ink/10 space-y-2">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider">Description</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{product.description}</p>
            </div>

            {/* Key Ingredients */}
            <div className="p-6 rounded-3xl bg-skymist/30 border border-ink/10 space-y-2">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider">Key Active Ingredients</h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {product.keyIngredients.map((ing, idx) => (
                  <Badge key={idx} variant="brand" size="sm">
                    {ing}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Full INCI Ingredients */}
            <div className="p-6 rounded-3xl bg-skymist/30 border border-ink/10 space-y-2">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider">Full INCI Ingredient List</h3>
              <p className="text-xs text-ink-muted font-mono leading-relaxed">{product.ingredients}</p>
            </div>

            {/* How to Use & Patch Test */}
            <div className="p-6 rounded-3xl bg-skymist/30 border border-ink/10 space-y-2">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider">How to Use & Patch Test</h3>
              <ol className="list-decimal list-inside text-xs text-ink-muted space-y-1">
                {product.howToUse.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <div className="pt-2 text-xs font-semibold text-coral flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Caution: {product.cautions}</span>
              </div>
            </div>

            {/* Indian Cosmetic Regulatory Details */}
            <div className="p-6 rounded-3xl bg-skymist/30 border border-ink/10 text-xs text-ink-muted space-y-1">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider mb-2">Product Compliance Info</h3>
              <p><strong className="text-ink">Net Quantity:</strong> {product.size}</p>
              <p><strong className="text-ink">Shelf Life:</strong> {product.shelfLife}</p>
              <p><strong className="text-ink">Country of Origin:</strong> {product.countryOfOrigin}</p>
              <p><strong className="text-ink">Marketer:</strong> {product.marketerName}, {product.marketerAddress}</p>
            </div>
          </div>
        </div>

        {/* Pairs Well With */}
        {related.length > 0 && (
          <div className="mt-20 border-t border-ink/10 pt-12 space-y-8">
            <h2 className="font-display font-bold text-2xl text-ink text-center sm:text-left">
              Pairs well with
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((rel) => (
                <div key={rel.id} className="p-4 rounded-3xl border border-ink/10 bg-white space-y-3 flex flex-col justify-between">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-skymist border border-ink/10">
                    <Image src={getAssetPath(rel.images[0] || "/images/hero/product.webp")} alt={rel.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink line-clamp-1">{rel.name}</h3>
                    <p className="text-xs text-ink-muted">{formatPrice(rel.price)}</p>
                  </div>
                  <Link href={`/product/${rel.slug}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

      </Container>
    </div>
  );
}
