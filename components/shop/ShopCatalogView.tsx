"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ShopUnlockGate } from "@/components/shop/ShopUnlockGate";
import { filterProducts, computeDiscountPercent } from "@/lib/catalog";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { Product } from "@/config/products";
import { Camera, ScanLine, Filter, X } from "lucide-react";

interface ShopCatalogViewProps {
  allProducts: Product[];
}

function CatalogContent({ allProducts }: { allProducts: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const concern = searchParams.get("concern") || undefined;
  const skin = searchParams.get("skin") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = (searchParams.get("sort") as "featured" | "price-asc" | "price-desc") || undefined;
  const q = searchParams.get("q") || undefined;

  const products = filterProducts({
    concern,
    skinType: skin,
    category,
    sort,
    query: q,
  });

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && params.get(key) !== value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <CartDrawer />

      <ShopUnlockGate>
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
              <li className="font-semibold text-ink">Shop</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-8 border-b border-ink/10">
            <div className="space-y-2">
              <Badge variant="brand" size="md">
                Formulated for Indian Weather
              </Badge>
              <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
                Shop <Accent>routines</Accent> & formulas
              </h1>
              <p className="text-sm text-ink-muted">
                Showing {products.length} {products.length === 1 ? "product" : "products"}
              </p>
            </div>

            <Link href="/face-analysis">
              <Button variant="outline" size="md" className="gap-2 shrink-0">
                <Camera className="w-4 h-4 text-brand" />
                <span>Not sure? Scan your face</span>
              </Button>
            </Link>
          </div>

          {/* Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 space-y-6 bg-skymist/30 p-6 rounded-3xl border border-ink/10 sticky top-[100px]">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand" />
                  <span>Filters</span>
                </h3>
                {(concern || skin || category || sort) && (
                  <Link href="/shop" className="text-[11px] font-bold text-coral hover:underline">
                    Clear all
                  </Link>
                )}
              </div>

              {/* Filter by Concern */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider">Concern</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["dryness", "dullness", "acne", "sun-care"].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateFilter("concern", c)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-block ${
                        concern === c
                          ? "bg-brand text-white border-brand font-bold"
                          : "bg-white text-ink border-ink/15 hover:border-brand"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter by Skin Type */}
              <div className="space-y-2 pt-2 border-t border-ink/10">
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider">Skin Type</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["Oily", "Dry", "Combination", "Sensitive", "Normal"].map((st) => (
                    <button
                      key={st}
                      onClick={() => updateFilter("skin", st)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-block ${
                        skin === st
                          ? "bg-brand text-white border-brand font-bold"
                          : "bg-white text-ink border-ink/15 hover:border-brand"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className="space-y-2 pt-2 border-t border-ink/10">
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider">Sort By</h4>
                <div className="space-y-1 text-xs font-medium text-ink">
                  {[
                    { label: "Featured", value: "featured" },
                    { label: "Price: Low to High", value: "price-asc" },
                    { label: "Price: High to Low", value: "price-desc" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateFilter("sort", s.value)}
                      className={`w-full text-left block px-3 py-2 rounded-xl transition-colors ${
                        sort === s.value ? "bg-brand text-white font-bold" : "hover:bg-skymist"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <main className="lg:col-span-9 space-y-6">
              {/* Active Filter Chips */}
              {(concern || skin || category) && (
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <span className="text-xs text-ink-muted">Active filters:</span>
                  {concern && (
                    <Badge variant="brand" size="sm" className="gap-1">
                      <span>Concern: {concern}</span>
                      <button onClick={() => updateFilter("concern", "")}>
                        <X className="w-3 h-3 hover:text-yellow" />
                      </button>
                    </Badge>
                  )}
                  {skin && (
                    <Badge variant="skymist" size="sm" className="gap-1">
                      <span>Skin: {skin}</span>
                      <button onClick={() => updateFilter("skin", "")}>
                        <X className="w-3 h-3 hover:text-coral" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              {products.length === 0 ? (
                <div className="py-20 text-center space-y-4 bg-skymist/30 rounded-3xl p-8 border border-ink/10">
                  <ScanLine className="w-10 h-10 text-brand mx-auto" />
                  <h3 className="font-display font-bold text-xl text-ink">Nothing matches your search</h3>
                  <p className="text-xs text-ink-muted">Clear a filter or take a free face scan to find your custom routine.</p>
                  <div className="flex justify-center gap-3">
                    <Link href="/shop">
                      <Button variant="outline" size="sm">Clear all filters</Button>
                    </Link>
                    <Link href="/face-analysis">
                      <Button variant="primary" size="sm">Start face scan</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {products.map((prod, idx) => {
                    const discount = computeDiscountPercent(prod.price, prod.mrp);
                    const is7th = (idx + 1) % 7 === 0;

                    return (
                      <React.Fragment key={prod.id}>
                        {is7th && (
                          <div className="bg-skymist/60 rounded-3xl p-6 border border-brand/20 flex flex-col justify-between text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand mx-auto shadow-xs">
                              <Camera className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-display font-bold text-base text-ink">Not sure what suits you?</h4>
                              <p className="text-xs text-ink-muted">Scan your face in 30 seconds for a plain-language match.</p>
                            </div>
                            <Link href="/face-analysis">
                              <Button variant="primary" size="sm" className="w-full text-xs ">
                                Start scan
                              </Button>
                            </Link>
                          </div>
                        )}

                        <div className="group bg-white rounded-3xl p-4 border border-ink/10 hover:border-brand/30 hover:shadow-card transition-all flex flex-col justify-between space-y-3">
                          <Link href={`/product/${prod.slug}`} className="space-y-3 block">
                            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-skymist border border-ink/10">
                              <Image
                                src={getAssetPath(prod.images[0] || "/images/hero/product.webp")}
                                alt={prod.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              {discount > 0 && (
                                <div className="absolute top-2 left-2 bg-ink text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  {discount}% OFF
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                                {prod.skinTypes.join(" • ")}
                              </span>
                              <h2 className="font-display font-bold text-sm text-ink group-hover:text-brand transition-colors line-clamp-1">
                                {prod.name}
                              </h2>
                              <p className="text-xs text-ink-muted line-clamp-2 font-normal">
                                {prod.tagline}
                              </p>
                            </div>
                          </Link>

                          <div className="pt-2 border-t border-ink/10 flex items-center justify-between">
                            <div>
                              <span className="font-display font-bold text-sm text-brand block">
                                {formatPrice(prod.price)}
                              </span>
                              {prod.mrp && prod.mrp > prod.price && (
                                <span className="text-[10px] text-ink-muted line-through block">
                                  {formatPrice(prod.mrp)}
                                </span>
                              )}
                            </div>
                            <Link href={`/product/${prod.slug}`}>
                              <Button variant="outline" size="sm" className="text-xs px-3 py-1.5">
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </Container>
      </ShopUnlockGate>
    </div>
  );
}

export function ShopCatalogView({ allProducts }: ShopCatalogViewProps) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink/60">Loading shop catalog...</div>}>
      <CatalogContent allProducts={allProducts} />
    </Suspense>
  );
}
