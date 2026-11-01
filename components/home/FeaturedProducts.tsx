"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, SectionTitle, focusRing } from "./shared";
import { bestsellerProducts } from "@/config/content";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { routineProducts, brandSourcePlaceholder } from "@/config/home-content";

const routine = routineProducts;

type Bestseller = (typeof bestsellerProducts)[number];
const toCartItem = (p: Bestseller) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  size: p.size,
  price: p.price,
  mrp: p.originalPrice ?? p.price,
  image: getAssetPath(p.image),
});

const chip = "text-[13px] font-medium px-2.5 py-1 rounded-[10px] bg-paper text-ink";

export function FeaturedProducts() {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const items = routine
    .map((r) => ({ ...r, data: bestsellerProducts.find((p) => p.slug === r.slug) }))
    .filter((r): r is (typeof routine)[number] & { data: (typeof bestsellerProducts)[number] } => Boolean(r.data));

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const handleAdd = (id: string) => {
    const item = items.find((i) => i.data.id === id);
    if (item) track("add_to_cart", { product_slug: item.slug, price: item.data.price, source: "landing_card" });
    if (item) addItem(toCartItem(item.data));
    setAdded((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [id]: false })), 1500);
    flash("Added to bag");
  };

  const handleAddAll = () => {
    items.forEach((i) => {
      track("add_to_cart", { product_slug: i.slug, price: i.data.price, source: "routine_button" });
      addItem(toCartItem(i.data));
    });
    flash("Full routine added to bag");
  };

  const total = items.reduce((sum, i) => sum + i.data.price, 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.data.originalPrice ?? i.data.price), 0);

  return (
    <>
      <Section id="products" labelledBy="products-title" pad="md">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <SectionTitle id="products-title">Start with the basics.</SectionTitle>
            <p className="mt-4 text-ink-muted max-w-[52ch]">Cleanse, treat, moisturise, protect. Four steps is plenty.</p>
          </div>
          <Link
            href="/shop"
            className={`hidden md:inline-flex items-center gap-2 font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
          >
            <span>View all products</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {items.map((p, i) => {
            const sale = p.data.price;
            const mrp = p.data.originalPrice ?? sale;
            const discount = mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;
            return (
              <li key={p.slug} data-product-slug={p.slug} className="flex flex-col">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
                  <span className="text-brand">{i + 1}</span> {p.step}
                </p>
                <div className="flex-1 bg-white border border-ink/15 rounded-[24px] p-3 sm:p-5 flex flex-col">
                  <div className="relative aspect-square rounded-[10px] bg-paper overflow-hidden mb-4">
                    {discount > 0 && (
                      <span className="absolute top-3 left-3 z-10 bg-ink text-white font-mono text-xs px-2.5 py-1 rounded-[10px]">
                        {discount}% off
                      </span>
                    )}
                    <Image
                      src={getAssetPath(p.image)}
                      alt={`${p.name}, ${p.data.size}`}
                      fill
                      sizes="(max-width: 1024px) 45vw, 280px"
                      className="object-contain p-4"
                    />
                  </div>

                  <div className="mb-3">
                    <span className={chip}>{p.skin}</span>
                  </div>

                  <h3
                    title={p.name}
                    className="font-display font-semibold text-lg leading-snug text-ink line-clamp-2 [overflow-wrap:anywhere]"
                  >
                    <Link href={`/product/${p.slug}`} className={`hover:text-brand rounded ${focusRing}`}>
                      {p.name}
                    </Link>
                  </h3>
                  <p className="hidden min-[480px]:block mt-1.5 text-[15px] leading-snug text-ink-muted line-clamp-2">
                    {p.descriptor}
                  </p>
                  <ul className="hidden min-[480px]:flex mt-3 flex-wrap gap-2" aria-label="Key actives">
                    {p.actives.slice(0, 3).map((a) => (
                      <li key={a} className={chip}>
                        {a}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-baseline gap-2 [font-feature-settings:'tnum']">
                    <span className="sr-only">Sale price</span>
                    <data value={sale} className="font-display text-xl font-semibold text-ink">
                      {formatPrice(sale)}
                    </data>
                    {discount > 0 && (
                      <>
                        <span className="sr-only">MRP</span>
                        <s className="text-[15px] text-ink-light">{formatPrice(mrp)}</s>
                      </>
                    )}
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleAdd(p.data.id)}
                      aria-label={`Add ${p.name} to bag`}
                    >
                      {added[p.data.id] ? <Check className="w-4 h-4" aria-hidden="true" /> : null}
                      <span>{added[p.data.id] ? "Added" : "Add"}</span>
                    </Button>
                    <p className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] text-ink-light">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      About 15 min in Vijayawada
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-t border-ink/20 pt-6">
          <p className="font-mono text-sm text-ink-muted [font-feature-settings:'tnum']">
            Full routine: {items.length} products, {formatPrice(total)} (MRP {formatPrice(mrpTotal)})
          </p>
          <Button variant="primary" size="md" onClick={handleAddAll} className="sm:w-auto">
            <span>Add full routine</span>
          </Button>
        </div>
        {brandSourcePlaceholder && <p className="mt-4 text-sm text-ink-light max-w-[62ch]">{brandSourcePlaceholder}</p>}
        <Link
          href="/shop"
          className={`md:hidden mt-4 inline-flex items-center gap-2 font-medium text-ink underline underline-offset-[5px] rounded ${focusRing}`}
        >
          <span>View all products</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>

        {toast && (
          <div
            role="status"
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] w-[min(420px,calc(100vw-32px))] bg-ink text-white rounded-[10px] px-[18px] py-3.5 flex items-center justify-between gap-4"
          >
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("gv:open-cart"))}
              className="font-semibold underline underline-offset-[3px] cursor-pointer rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              View bag
            </button>
          </div>
        )}
      </Section>
    </>
  );
}
