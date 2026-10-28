"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { Accent } from "@/components/ui/Accent";
import { bestsellerProducts } from "@/config/content";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { useCartStore } from "@/lib/store";
import { ShoppingBag, ArrowRight, Check, Zap } from "lucide-react";

export function Bestsellers() {
  const featuredProduct = bestsellerProducts[0];
  const regularProducts = bestsellerProducts.slice(1);
  const addItem = useCartStore((s) => s.addItem);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleQuickAdd = (id: string) => {
    addItem(id);
    setAddedIds((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [id]: false }));
    }, 1500);
  };

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-ink/10">
      <Container>
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="skymist" size="md">
              Most Reordered
            </Badge>
            <h2 className="font-display text-h2-section text-ink text-wrap-balance">
              The ones people <Accent>keep</Accent> reordering.
            </h2>
          </div>

          <Link href="/shop" className="mt-4 md:mt-0 shrink-0">
            <Button variant="outline" size="md" className="gap-2">
              <span>View all shop</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Asymmetric Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Featured Large Card (5 cols x 2 rows) */}
          <div className="lg:col-span-5 bg-skymist/60 rounded-3xl p-6 sm:p-8 border border-brand/15 flex flex-col justify-between group hover:border-brand/40 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <Badge variant="coral" size="md">
                  {featuredProduct.badge || "Bestseller #1"}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand bg-white px-2.5 py-1 rounded-full border border-brand/10">
                  <Zap className="w-3.5 h-3.5 text-coral fill-coral" />
                  <span>Arrives in ~15 min</span>
                </div>
              </div>

              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-white border border-brand/10">
                <Image
                  src={getAssetPath(featuredProduct.image)}
                  alt={featuredProduct.altText}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    {featuredProduct.skinTypeTag}
                  </Badge>
                  <Rating rating={featuredProduct.rating} reviewCount={featuredProduct.reviewCount} size="sm" />
                </div>

                <h3 className="font-display font-bold text-2xl text-ink group-hover:text-brand transition-colors">
                  <Link href={`/product/${featuredProduct.slug}`}>
                    {featuredProduct.name}
                  </Link>
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed font-normal">
                  {featuredProduct.subtitle}
                </p>

                {/* Key ingredients pill */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {featuredProduct.keyIngredients.map((ing) => (
                    <span key={ing} className="text-[10.5px] font-semibold bg-white text-ink/70 px-2 py-0.5 rounded-md border border-ink/10">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-ink/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-ink-muted line-through block font-semibold">
                  {formatPrice(featuredProduct.originalPrice || 899)}
                </span>
                <span className="font-display font-bold text-2xl text-brand">
                  {formatPrice(featuredProduct.price)}
                </span>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleQuickAdd(featuredProduct.id)}
                className="gap-2  text-button-label"
              >
                {addedIds[featuredProduct.id] ? (
                  <>
                    <Check className="w-4 h-4 text-ink" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-ink" />
                    <span>Quick Add</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Regular 4 Product Cards (7 cols, 2x2 grid) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {regularProducts.map((product) => {
              const mrp = product.originalPrice || product.price + 200;
              const discountPercent = Math.round(((mrp - product.price) / mrp) * 100);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl p-5 border border-ink/10 flex flex-col justify-between hover:border-brand/30 hover:shadow-card transition-all group"
                >
                  <div>
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-skymist/30 border border-ink/5">
                      <Image
                        src={getAssetPath(product.image)}
                        alt={product.altText}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.badge && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="coral" size="sm">
                            {product.badge}
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="skymist" size="sm">
                          {product.skinTypeTag}
                        </Badge>
                        <Rating rating={product.rating} showText={false} size="sm" />
                      </div>

                      <h4 className="font-display font-bold text-base text-ink group-hover:text-brand transition-colors pt-1">
                        <Link href={`/product/${product.slug}`}>{product.name}</Link>
                      </h4>
                      <p className="text-xs text-ink-muted line-clamp-2">
                        {product.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-ink/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-ink-muted line-through block font-semibold">
                        {formatPrice(mrp)}
                      </span>
                      <span className="font-display font-bold text-lg text-ink">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleQuickAdd(product.id)}
                      className="gap-1.5 text-xs py-2 px-3"
                    >
                      {addedIds[product.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-ink" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 text-ink" />
                          <span>Add</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
