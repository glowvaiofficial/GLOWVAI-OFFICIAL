"use client";

import React, { useState } from "react";
import { Product } from "@/config/products";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { computeDiscountPercent } from "@/lib/catalog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShoppingBag, Plus, Minus, CheckCircle2, MessageCircle, Lock, ShieldCheck } from "lucide-react";

interface ProductBuyBoxProps {
  product: Product;
}

export function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const [selectedSize, setSelectedSize] = useState(product.size);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const activePrice =
    product.sizes?.find((s) => s.size === selectedSize)?.price || product.price;
  const activeMrp =
    product.sizes?.find((s) => s.size === selectedSize)?.mrp || product.mrp;
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

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-xl space-y-6">
      
      {/* Title & Tagline */}
      <div className="space-y-1.5">
        <Badge variant="brand" size="sm" className="mb-1">
          {product.category}
        </Badge>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
          {product.name}
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted">{product.tagline}</p>
      </div>

      {/* Price & Taxes */}
      <div className="space-y-1 border-y border-ink/10 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-bold text-3xl text-brand">
            {formatPrice(activePrice)}
          </span>
          {activeMrp && activeMrp > activePrice && (
            <span className="text-sm text-ink-muted line-through">
              {formatPrice(activeMrp)}
            </span>
          )}
          {discount > 0 && (
            <span className="bg-ink text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
              {discount}% OFF
            </span>
          )}
        </div>
        <span className="text-[11px] text-ink-muted block">
          Inclusive of all taxes. Free shipping on qualifying orders.
        </span>
      </div>

      {/* Size Selector */}
      {product.sizes && product.sizes.length > 1 && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink uppercase tracking-wider">Select Size</label>
          <div className="flex gap-2">
            {product.sizes.map((sz) => (
              <button
                key={sz.size}
                type="button"
                onClick={() => setSelectedSize(sz.size)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedSize === sz.size
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "bg-white text-ink border-ink/20 hover:border-brand"
                }`}
              >
                {sz.size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Stepper & Add Button */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border border-ink/20 rounded-2xl p-2 bg-skymist/30">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-ink hover:text-brand shadow-xs"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-ink w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-ink hover:text-brand shadow-xs"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="flex-1  text-button-label gap-2"
          >
            {isAdded ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 text-ink shrink-0" />
                <span>Add to Cart</span>
              </>
            )}
          </Button>
        </div>

        {/* Buy via WhatsApp */}
        {siteConfig.phone && siteConfig.phone.trim() !== "" && (
          <a
            href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-mint hover:bg-mint/70 text-ink font-bold text-xs py-3 px-4 rounded-2xl shadow-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-ink shrink-0" />
            <span>Buy via WhatsApp</span>
          </a>
        )}
      </div>

      {/* Trust Badges */}
      <div className="pt-2 border-t border-ink/10 grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>Photos stored privately</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>Made in India</span>
        </div>
      </div>

    </div>
  );
}
