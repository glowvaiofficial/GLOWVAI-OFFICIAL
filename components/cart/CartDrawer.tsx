"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, MessageCircle } from "lucide-react";
import { submitPublicForm } from "@/lib/forms/submit";
import { focusRing } from "@/components/home/shared";

export function CartDrawer() {
  const {
    items,
    isOpen,
    checkoutEnabled,
    closeCart,
    removeItem,
    updateQuantity,
    revalidatePrices,
    getSubtotal,
    getTotalSavings,
  } = useCartStore();

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (isOpen) {
      revalidatePrices();
    }
  }, [isOpen, revalidatePrices]);

  // Escape closes the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const savings = getTotalSavings();

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistEmail && waitlistEmail.includes("@")) {
      await submitPublicForm("Waitlist", { email: waitlistEmail, pincode: "CART", source: "cart", consent: "yes" });
      setWaitlistSuccess(true);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ${siteConfig.name}, I would like to place an order:\n\n${items
      .filter((i) => i.available)
      .map((i) => `• ${i.name} (${i.size}) x${i.quantity} = ₹${i.price * i.quantity}`)
      .join("\n")}\n\nTotal: ₹${subtotal}`
  );

  const qtyButton = `w-9 h-9 rounded-[10px] border-[1.5px] border-ink/20 bg-white flex items-center justify-center hover:border-ink ${focusRing}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={closeCart} className="fixed inset-0 bg-ink/50" aria-hidden="true" />

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="relative w-full max-w-md bg-paper text-ink h-full flex flex-col z-10 border-l border-ink/15"
      >
        <div className="px-6 py-5 border-b border-ink/15 flex items-center justify-between">
          <h2 id="cart-title" className="font-display font-semibold text-xl">
            Your bag <span className="text-ink-muted font-normal">({items.length})</span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className={`w-11 h-11 rounded-[10px] border-[1.5px] border-ink/20 bg-white flex items-center justify-center hover:border-ink ${focusRing}`}
            aria-label="Close bag"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-6 space-y-5">
              <div className="relative aspect-[16/10] w-full rounded-[16px] overflow-hidden bg-paper-deep border border-ink/15 shadow-2xs">
                <Image
                  src={getAssetPath("/images/home-ai/products_shelf.png")}
                  alt="GLOW VAI matched skincare routine products"
                  fill
                  sizes="380px"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1.5">
                <p className="font-display font-semibold text-2xl">Your bag is empty.</p>
                <p className="text-ink-muted">Start with the free face scan and we will suggest a routine.</p>
              </div>
              <Link
                href="/face-analysis"
                onClick={closeCart}
                className={`inline-flex items-center gap-2 min-h-[52px] px-6 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}
              >
                Scan my face
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`p-3 rounded-[10px] border flex gap-4 ${item.available ? "border-ink/15 bg-white" : "border-ink/30 bg-paper-deep"}`}
                >
                  <div className="relative w-20 h-20 rounded-[8px] overflow-hidden bg-paper-deep shrink-0 border border-ink/10">
                    <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug line-clamp-2">{item.name}</p>
                        <p className="text-[13px] text-ink-muted">{item.size}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.id);
                          setAnnouncement(`Removed ${item.name} from bag`);
                        }}
                        className={`w-9 h-9 shrink-0 rounded-[8px] flex items-center justify-center text-ink-muted hover:text-ink ${focusRing}`}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {!item.available ? (
                      <p className="text-[14px] font-semibold text-[#9B1C1C]">No longer available</p>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2" role="group" aria-label={`Quantity of ${item.name}`}>
                          <button
                            type="button"
                            onClick={() => {
                              updateQuantity(item.id, -1);
                              setAnnouncement(`Decreased quantity of ${item.name}`);
                            }}
                            className={qtyButton}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center font-semibold [font-feature-settings:'tnum']">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              updateQuantity(item.id, 1);
                              setAnnouncement(`Increased quantity of ${item.name}`);
                            }}
                            className={qtyButton}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                          {item.mrp && item.mrp > item.price && (
                            <p className="text-[13px] text-ink-light line-through">{formatPrice(item.mrp * item.quantity)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-ink/15 bg-white space-y-4">
            <dl className="space-y-2 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-semibold">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">You save</dt>
                  <dd className="font-semibold">− {formatPrice(savings)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[13px] text-ink-light pt-2 border-t border-ink/15">
                <dt>Taxes and delivery</dt>
                <dd>Calculated at checkout</dd>
              </div>
            </dl>

            {checkoutEnabled ? (
              <button type="button" className={`w-full min-h-[52px] rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark ${focusRing}`}>
                Proceed to checkout
              </button>
            ) : (
              <div className="space-y-3">
                {siteConfig.phone && siteConfig.phone.trim() !== "" && (
                  <a
                    href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark ${focusRing}`}
                  >
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    <span>Order on WhatsApp</span>
                  </a>
                )}

                <div className="border border-ink/15 rounded-[10px] p-4 space-y-3">
                  <p className="font-semibold">Online payment is coming soon.</p>
                  {waitlistSuccess ? (
                    <p role="status" className="text-ink-muted">Thanks. We will email you when online payment opens.</p>
                  ) : (
                    <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-2">
                      <label htmlFor="cart-waitlist" className="sr-only">
                        Email for the online payment waitlist
                      </label>
                      <input
                        id="cart-waitlist"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        className="flex-1 min-h-[44px] px-3 rounded-[10px] border-[1.5px] border-ink/30 text-[15px] focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                      />
                      <button type="submit" className={`min-h-[44px] px-4 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
                        Notify me
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            <p className="text-[13px] text-ink-light text-center">Cosmetic skin insights, not medical advice.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
