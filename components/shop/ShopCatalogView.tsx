"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { filterProducts, computeDiscountPercent } from "@/lib/catalog";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { Product } from "@/config/products";
import { useCartStore } from "@/lib/store/cart";
import { Check, ShoppingBag, ScanLine } from "lucide-react";

interface ShopCatalogViewProps {
  allProducts: Product[];
}

const concerns = [
  { key: "dryness", label: "Dehydration" },
  { key: "dullness", label: "Dullness" },
  { key: "acne", label: "Breakouts" },
  { key: "pigmentation", label: "Dark spots" },
  { key: "sun-care", label: "Sun protection" },
];

const skinTypes = ["Oily", "Dry", "Combination", "Sensitive", "Normal"];

const sorts = [
  { label: "Featured", value: "featured" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
];

const chip = (active: boolean) =>
  `inline-flex items-center min-h-[44px] px-4 rounded-[10px] border text-[15px] font-medium whitespace-nowrap ${focusRing} ${
    active ? "bg-brand border-brand text-white" : "bg-white border-ink/20 text-ink hover:border-ink"
  }`;

function QuickAdd({ prod }: { prod: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        addItem({
          id: `${prod.id}-${prod.size}`,
          slug: prod.slug,
          name: prod.name,
          size: prod.size,
          price: prod.price,
          mrp: prod.mrp,
          image: getAssetPath(prod.images[0] || "/images/hero/product.webp"),
          quantity: 1,
        });
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      aria-label={`Add ${prod.name} to bag`}
      className={`w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark ${focusRing}`}
    >
      {done ? <Check className="w-4 h-4" aria-hidden="true" /> : <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
      <span aria-live="polite">{done ? "Added" : "Add to bag"}</span>
    </button>
  );
}

function CatalogContent({ allProducts }: { allProducts: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const concern = searchParams.get("concern") || undefined;
  const skin = searchParams.get("skin") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = (searchParams.get("sort") as "featured" | "price-asc" | "price-desc") || undefined;
  const q = searchParams.get("q") || undefined;

  const products = filterProducts({ concern, skinType: skin, category, sort, query: q });
  const anyFilter = Boolean(concern || skin || category || q);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && params.get(key) !== value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  };

  return (
    <div className="bg-paper text-ink">
              <Section pad="tight" labelledBy="shop-title">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className={`underline underline-offset-4 rounded ${focusRing}`}>
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink font-medium">Shop</li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 border-b border-ink/20">
            <div>
              <Eyebrow>Formulated for Indian weather</Eyebrow>
              <h1 id="shop-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]">
                Shop routines.
              </h1>
              <p className="mt-4 text-ink-muted" aria-live="polite">
                {products.length} {products.length === 1 ? "product" : "products"}
                {anyFilter ? " match your filters" : ""}
              </p>
            </div>
            <Link
              href="/face-analysis"
              className={`inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink shrink-0 ${focusRing}`}
            >
              <ScanLine className="w-5 h-5 text-brand" aria-hidden="true" />
              Not sure? Scan your face
            </Link>
          </div>

          {/* Filters: concern chips, skin-type chips, sort and clear */}
          <div className="py-6 border-b border-ink/20 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted w-24 shrink-0">Concern</p>
              <div role="group" aria-label="Filter by concern" className="flex flex-wrap gap-2">
                {concerns.map((c) => (
                  <button key={c.key} type="button" aria-pressed={concern === c.key} onClick={() => updateFilter("concern", c.key)} className={chip(concern === c.key)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted w-24 shrink-0">Skin type</p>
              <div role="group" aria-label="Filter by skin type" className="flex flex-wrap gap-2">
                {skinTypes.map((st) => (
                  <button key={st} type="button" aria-pressed={skin === st} onClick={() => updateFilter("skin", st)} className={chip(skin === st)}>
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-4 flex-wrap">
                <label htmlFor="shop-sort" className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                  Sort
                </label>
                <select
                  id="shop-sort"
                  value={sort ?? "featured"}
                  onChange={(e) => updateFilter("sort", e.target.value === "featured" ? "" : e.target.value)}
                  className={`min-h-[44px] px-4 rounded-[10px] border-[1.5px] border-ink/20 bg-white text-[15px] font-medium ${focusRing}`}
                >
                  {sorts.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {anyFilter && (
                <Link href="/shop" className={`font-medium underline underline-offset-4 rounded ${focusRing}`}>
                  Clear all filters
                </Link>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="pt-10">
            {products.length === 0 ? (
              <div className="border border-ink/15 bg-white rounded-[24px] p-8 sm:p-10 max-w-[640px]">
                <h2 className="font-display font-semibold text-2xl">Nothing matches those filters.</h2>
                <p className="mt-2 text-ink-muted">Clear a filter, or scan your face to get a routine matched to your skin.</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link href="/shop" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}>
                    Clear filters
                  </Link>
                  <Link href="/face-analysis" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold ${focusRing}`}>
                    Scan my face
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                {products.map((prod) => {
                  const discount = computeDiscountPercent(prod.price, prod.mrp);
                  return (
                    <li key={prod.id} className="flex flex-col">
                      <Link href={`/product/${prod.slug}`} className={`group block rounded-[10px] ${focusRing}`}>
                        <div className="relative aspect-[4/5] rounded-[10px] overflow-hidden border border-ink/15 bg-paper-deep">
                          <Image
                            src={getAssetPath(prod.images[0] || "/images/hero/product.webp")}
                            alt={prod.name}
                            fill
                            sizes="(max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                          {discount > 0 && (
                            <span className="absolute top-3 left-3 bg-white text-ink font-mono text-[11px] uppercase tracking-[0.1em] px-2 py-1 rounded-[6px]">
                              {discount}% off
                            </span>
                          )}
                        </div>
                        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                          {prod.skinTypes.slice(0, 2).join(" · ")}
                        </p>
                        <h2 className="mt-1 font-display font-semibold text-lg leading-snug group-hover:underline underline-offset-4">{prod.name}</h2>
                        <p className="mt-1 text-[15px] text-ink-muted line-clamp-2">{prod.tagline}</p>
                      </Link>
                      <p className="mt-4 font-semibold text-lg">
                        {formatPrice(prod.price)}
                        {prod.mrp > prod.price && <span className="ml-2 text-sm font-normal text-ink-light line-through">{formatPrice(prod.mrp)}</span>}
                      </p>
                      <div className="mt-3">
                        <QuickAdd prod={prod} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>

        <Section tone="deep" pad="tight" labelledBy="shop-help">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 id="shop-help" className="font-display font-semibold text-2xl">Not sure what suits you?</h2>
              <p className="mt-2 text-ink-muted max-w-[52ch]">The free scan takes about 30 seconds and suggests a routine from this shop.</p>
            </div>
            <Link href="/face-analysis" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold shrink-0 ${focusRing}`}>
              Scan my face, free
            </Link>
          </div>
        </Section>
          </div>
  );
}

export function ShopCatalogView({ allProducts }: ShopCatalogViewProps) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-muted">Loading the shop…</div>}>
      <CatalogContent allProducts={allProducts} />
    </Suspense>
  );
}
