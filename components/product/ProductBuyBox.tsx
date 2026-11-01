"use client";

import React, { useState } from "react";
import { Product } from "@/config/products";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { computeDiscountPercent } from "@/lib/catalog";
import { Check, Minus, Plus, ShoppingBag, MessageCircle } from "lucide-react";
import { focusRing } from "@/components/home/shared";

interface ProductBuyBoxProps {
  product: Product;
}

export function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const [selectedSize, setSelectedSize] = useState(product.size);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const activePrice = product.sizes?.find((s) => s.size === selectedSize)?.price || product.price;
  const activeMrp = product.sizes?.find((s) => s.size === selectedSize)?.mrp || product.mrp;
  const discount = computeDiscountPercent(activePrice, activeMrp);

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${selectedSize}`,
      slug: product.slug,
      name: product.name,
      size: selectedSize,
      price: activePrice,
      mrp: activeMrp,
      image: getAssetPath(product.images[0] || "/images/hero/product.webp"),
      quantity,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello GLOW VAI, I would like to buy: ${product.name} (${selectedSize}) x${quantity} - ₹${activePrice * quantity}. Page: ${siteConfig.url}/product/${product.slug}`
  );

  const stepper = `w-11 h-11 rounded-[10px] border-[1.5px] border-ink/20 bg-white flex items-center justify-center hover:border-ink ${focusRing}`;

  return (
    <div className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">{product.category}</p>
        <h1 className="font-display font-semibold text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-[1.05] tracking-[-0.02em]">{product.name}</h1>
        <p className="text-[15px] text-ink-muted">{product.tagline}</p>
      </div>

      <div className="border-y border-ink/15 py-5 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display font-semibold text-4xl [font-feature-settings:'tnum']">{formatPrice(activePrice)}</span>
          {activeMrp && activeMrp > activePrice && <span className="text-base text-ink-light line-through">{formatPrice(activeMrp)}</span>}
          {discount > 0 && <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">{discount}% off</span>}
        </div>
        <p className="text-[13px] text-ink-light">Inclusive of all taxes.</p>
      </div>

      {product.sizes && product.sizes.length > 1 && (
        <fieldset>
          <legend className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted mb-2">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((sz) => {
              const on = selectedSize === sz.size;
              return (
                <button
                  key={sz.size}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedSize(sz.size)}
                  className={`min-h-[44px] px-4 rounded-[10px] border-[1.5px] text-[15px] font-semibold ${focusRing} ${
                    on ? "bg-brand border-brand text-white" : "bg-white border-ink/20 text-ink hover:border-ink"
                  }`}
                >
                  {sz.size}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex items-stretch gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className={stepper} aria-label="Decrease quantity">
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center font-semibold text-lg [font-feature-settings:'tnum']" aria-live="polite">
            {quantity}
          </span>
          <button type="button" onClick={() => setQuantity((q) => q + 1)} className={stepper} aria-label="Increase quantity">
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-[10px] bg-brand text-white font-semibold text-[15px] hover:bg-brand-dark ${focusRing}`}
        >
          {isAdded ? <Check className="w-5 h-5" aria-hidden="true" /> : <ShoppingBag className="w-5 h-5" aria-hidden="true" />}
          <span aria-live="polite">{isAdded ? "Added to bag" : "Add to bag"}</span>
        </button>
      </div>

      {siteConfig.phone && siteConfig.phone.trim() !== "" && (
        <a
          href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold text-[15px] hover:border-ink ${focusRing}`}
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
          <span>Order on WhatsApp</span>
        </a>
      )}

      <ul className="border-t border-ink/15 pt-4 space-y-2 text-[14px] text-ink-muted">
        <li>Face scan photos are stored privately. Delete yours anytime at contact@glowvai.in.</li>
        <li>Made in {product.countryOfOrigin || "India"}.</li>
      </ul>
    </div>
  );
}
