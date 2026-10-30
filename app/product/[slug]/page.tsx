import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { getProducts, getProductBySlug, getRelatedProducts, computeDiscountPercent } from "@/lib/catalog";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { CheckCircle2, ScanLine } from "lucide-react";

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
    <div className="bg-paper text-ink">
      <CartDrawer />
      <JsonLd data={productGraph} />

      <Section pad="tight" labelledBy="product-title">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className={`underline underline-offset-4 rounded ${focusRing}`}>Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/shop" className={`underline underline-offset-4 rounded ${focusRing}`}>Shop</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
          {/* Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden border border-ink/15 bg-paper-deep">
              <Image
                src={getAssetPath(product.images[0] || "/images/hero/product.webp")}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-white text-ink font-mono text-[11px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-[6px]">
                  {discount}% off
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <ul className="grid grid-cols-4 gap-3">
                {product.images.map((img, idx) => (
                  <li key={idx} className="relative aspect-square rounded-[10px] overflow-hidden border border-ink/15 bg-paper-deep">
                    <Image src={getAssetPath(img)} alt={`${product.name}, view ${idx + 1}`} fill sizes="(max-width: 1024px) 25vw, 120px" className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Buy box */}
          <div className="lg:col-span-5 lg:sticky lg:top-[96px] space-y-6">
            <ProductBuyBox product={product} />
            <div className="border border-ink/15 bg-white rounded-[24px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-lg">Not sure this suits you?</p>
                <p className="text-[15px] text-ink-muted">A 30-second face scan checks your hydration and barrier scores.</p>
              </div>
              <Link
                href="/face-analysis"
                className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-[10px] border-[1.5px] border-ink/20 font-semibold hover:border-ink shrink-0 ${focusRing}`}
              >
                <ScanLine className="w-5 h-5 text-brand" aria-hidden="true" />
                Scan my face
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Details */}
      <Section tone="deep" pad="tight" labelledBy="details-title">
        <SectionTitle id="details-title">Formula and details</SectionTitle>
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h3 className="font-display font-semibold text-xl">About this product</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">{product.description}</p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-xl">Key actives</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.keyIngredients.map((ing) => (
                  <li key={ing} className="min-h-[36px] inline-flex items-center px-3 rounded-[10px] bg-white border border-ink/15 text-[15px]">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-semibold text-xl">How to use</h3>
              <ol className="mt-3 space-y-3 text-ink-muted">
                {product.howToUse.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="font-mono text-sm text-brand pt-0.5">{String(idx + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 inline-flex items-start gap-2 text-[15px] text-ink">
                <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
                <span>{product.cautions}</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
              <h3 className="font-display font-semibold text-xl">Full ingredient list (INCI)</h3>
              <p className="mt-3 font-mono text-[13px] leading-relaxed text-ink-muted">{product.ingredients}</p>
            </div>
            <div className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
              <h3 className="font-display font-semibold text-xl">Product information</h3>
              <dl className="mt-4 border-t border-ink/15">
                {[
                  ["Net quantity", product.size],
                  ["Shelf life", product.shelfLife],
                  ["Country of origin", product.countryOfOrigin],
                  ["Marketer", `${product.marketerName}, ${product.marketerAddress}`],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-6 border-b border-ink/15">
                    <dt className="py-3 text-[15px] font-semibold">{k}</dt>
                    <dd className="py-3 text-[15px] text-ink-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section pad="tight" labelledBy="related-title">
          <SectionTitle id="related-title">Pairs well with</SectionTitle>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((rel) => (
              <li key={rel.id} className="bg-white border border-ink/15 rounded-[10px] p-3 flex flex-col">
                <Link href={`/product/${rel.slug}`} className={`group block rounded ${focusRing}`}>
                  <div className="relative aspect-square rounded-[8px] overflow-hidden bg-paper">
                    <Image src={getAssetPath(rel.images[0] || "/images/hero/product.webp")} alt={rel.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <h3 className="mt-3 font-display font-semibold text-lg leading-snug group-hover:underline underline-offset-4">{rel.name}</h3>
                </Link>
                <p className="mt-1 font-semibold">{formatPrice(rel.price)}</p>
                <Link
                  href={`/product/${rel.slug}`}
                  className={`mt-3 inline-flex items-center justify-center min-h-[44px] rounded-[10px] border-[1.5px] border-ink/20 font-semibold hover:border-ink ${focusRing}`}
                >
                  View product
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
