"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Lock, MessageCircle } from "lucide-react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";

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

  // Handle ESC key to close drawer
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
        className="relative w-full max-w-md bg-white text-ink h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300 border-l border-ink/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-ink/10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <ShoppingBag className="w-5 h-5 text-brand" />
            <span>Your Cart ({items.length})</span>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-skymist flex items-center justify-center text-ink hover:bg-brand hover:text-white transition-colors"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-skymist flex items-center justify-center text-brand mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-ink">Your cart is empty</h3>
                <p className="text-xs text-ink-muted">
                  Start with a 30-second free face scan to find your matched routine.
                </p>
              </div>
              <Link href="/face-analysis" onClick={closeCart}>
                <Button variant="primary" size="md" className="gap-2 shadow-coral-glow text-button-label">
                  <span>Start free scan</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                    item.available
                      ? "border-ink/10 bg-white"
                      : "border-coral/30 bg-blush/30 opacity-75"
                  }`}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-skymist shrink-0 border border-ink/10">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-ink leading-tight line-clamp-1">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-ink-muted block">{item.size}</span>
                      </div>
                      <button
                        onClick={() => {
                          removeItem(item.id);
                          setAnnouncement(`Removed ${item.name} from cart`);
                        }}
                        className="text-ink-muted hover:text-coral transition-colors"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!item.available ? (
                      <span className="text-[10px] font-bold text-coral block">
                        No longer available
                      </span>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 border border-ink/15 rounded-lg px-2 py-0.5 bg-skymist/40">
                          <button
                            onClick={() => {
                              updateQuantity(item.id, -1);
                              setAnnouncement(`Decreased quantity for ${item.name}`);
                            }}
                            className="text-ink hover:text-brand"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-ink w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              updateQuantity(item.id, 1);
                              setAnnouncement(`Increased quantity for ${item.name}`);
                            }}
                            className="text-ink hover:text-brand"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-brand block">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          {item.mrp && item.mrp > item.price && (
                            <span className="text-[10px] text-ink-muted line-through block">
                              {formatPrice(item.mrp * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-ink/10 bg-skymist/30 space-y-4">
            <div className="space-y-1.5 text-xs text-ink">
              <div className="flex justify-between">
                <span className="text-ink-muted">Subtotal:</span>
                <span className="font-bold text-ink">{formatPrice(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-brand font-semibold">
                  <span>Total Savings:</span>
                  <span>- {formatPrice(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-ink-muted pt-1 border-t border-ink/10">
                <span>Taxes & Shipping:</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            {/* Checkout Options */}
            {checkoutEnabled ? (
              <Button variant="primary" size="lg" className="w-full shadow-coral-glow text-button-label">
                <span>Proceed to Checkout</span>
              </Button>
            ) : (
              <div className="space-y-3">
                {/* WhatsApp Order Option */}
                {siteConfig.phone && siteConfig.phone.trim() !== "" && (
                  <a
                    href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Order via WhatsApp</span>
                  </a>
                )}

                {/* Waitlist Form */}
                <div className="bg-white p-3.5 rounded-2xl border border-ink/10 text-xs space-y-2">
                  <span className="font-bold text-ink block">Online checkout coming soon:</span>
                  {waitlistSuccess ? (
                    <p className="text-brand font-semibold">
                      Added to checkout waitlist! We will notify you when online payments go live.
                    </p>
                  ) : (
                    <form onSubmit={handleJoinWaitlist} className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="Enter email for checkout priority"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-ink/20 text-xs focus:outline-none"
                      />
                      <Button variant="primary" size="sm" type="submit">
                        Notify
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-muted">
              <Lock className="w-3 h-3 text-brand" />
              <span>Cosmetic skin insights • Encrypted session</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
