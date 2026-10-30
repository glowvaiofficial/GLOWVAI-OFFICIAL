"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { focusRing } from "@/components/home/shared";
import type { Product } from "@/config/products";

export function ConcernProducts({ products }: { products: Product[] }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <p className="text-ink-muted">
        No products are listed for this concern yet.{" "}
        <Link href="/shop" className={`underline underline-offset-4 rounded ${focusRing}`}>
          Browse the full shop
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {products.map((p) => (
        <li key={p.id} className="bg-white border border-ink/15 rounded-[10px] p-3 flex flex-col">
          <Link href={`/product/${p.slug}`} className={`block rounded ${focusRing}`}>
            <div className="relative aspect-[4/5] rounded-[8px] overflow-hidden bg-paper">
              <Image src={getAssetPath(p.images[0] || "/images/hero/product.webp")} alt={p.name} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">{p.category}</p>
            <h3 className="font-display font-semibold text-base leading-snug">{p.name}</h3>
          </Link>
          <p className="mt-1 text-[14px] text-ink-muted line-clamp-2">{p.tagline}</p>
          <p className="mt-2 font-semibold">
            {formatPrice(p.price)}
            {p.mrp > p.price && <span className="ml-2 text-sm font-normal text-ink-light line-through">{formatPrice(p.mrp)}</span>}
          </p>
          <button
            type="button"
            onClick={() => {
              addItem({ id: `${p.id}-${p.size}`, slug: p.slug, name: p.name, size: p.size, price: p.price, mrp: p.mrp, image: getAssetPath(p.images[0] || "/images/hero/product.webp") });
              setAdded(p.id);
              setTimeout(() => setAdded(null), 1800);
            }}
            className={`mt-3 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark ${focusRing}`}
          >
            {added === p.id ? <Check className="w-4 h-4" aria-hidden="true" /> : <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
            <span aria-live="polite">{added === p.id ? "Added" : "Add to bag"}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
