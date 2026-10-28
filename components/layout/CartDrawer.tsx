"use client";

import React, { useState } from "react";
import { X, ShoppingBag, ArrowRight, ShieldCheck, Zap, AlertTriangle, Sparkles, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const cartItems = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  if (!isOpen) return null;

  const total = getSubtotal();

  const handleProceedCheckout = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMaintenanceModal(true);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
        className="fixed inset-0 z-[100] bg-ink/60 backdrop-blur-sm flex justify-end animate-fadeIn"
      >
        <div className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand" />
              <h2 className="font-display text-xl font-bold text-ink">Your Express Basket</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close cart"
              className="w-9 h-9 rounded-full bg-ink-subtle hover:bg-ink/10 flex items-center justify-center text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 py-6 space-y-4 overflow-y-auto">
            <div className="bg-skymist/80 rounded-2xl p-3.5 flex items-center gap-3 border border-brand/15">
              <Zap className="w-5 h-5 text-brand shrink-0" />
              <p className="text-xs text-brand font-semibold">
                Delivering to Vijayawada in <span className="font-bold underline">~15 minutes</span> via Dark Store express riders.
              </p>
            </div>

            {cartItems.length === 0 ? (
              /* DEFAULT EMPTY CART VIEW */
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-skymist text-brand flex items-center justify-center mx-auto border border-brand/15 shadow-sm">
                  <ShoppingBag className="w-8 h-8 text-brand" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-lg text-ink">Your cart is currently empty</h3>
                  <p className="text-xs text-ink-muted max-w-xs mx-auto">
                    Take a 30-second free AI Face Scan or explore our Minimalist & Derma Co routines!
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Link href="/face-analysis" onClick={onClose}>
                    <Button variant="primary" size="md" className="w-full gap-2 bg-brand hover:bg-brand-dark text-white font-bold text-xs">
                      <Camera className="w-4 h-4 text-white" />
                      <span>Start Free AI Face Scan</span>
                    </Button>
                  </Link>
                  <Link href="/shop" onClick={onClose}>
                    <Button variant="outline" size="md" className="w-full text-xs font-bold text-ink">
                      <span>Explore Products</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* POPULATED CART ITEMS VIEW */
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-ink/10 bg-white shadow-xs">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-skymist shrink-0 border border-ink/10">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-sm text-ink truncate">{item.name}</h3>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-ink-light hover:text-coral p-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-ink-muted">{item.size}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-sm text-brand">{formatPrice(item.price)}</span>
                        <div className="flex items-center border border-ink/10 rounded-lg px-2 py-0.5 text-xs font-semibold gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="text-ink-muted hover:text-brand">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="text-ink-muted hover:text-brand">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {cartItems.length > 0 && (
            <div className="border-t border-ink/10 pt-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-ink-muted font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-ink">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-ink-muted font-medium">
                  <span>Vijayawada Dark Store Express Delivery</span>
                  <span className="text-brand font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-base font-bold text-ink border-t border-ink/10 pt-2">
                  <span>Total Pay</span>
                  <span className="text-brand">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedCheckout}
                className="w-full py-3.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <span>Proceed to Express Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-ink-muted font-medium">
                <ShieldCheck className="w-4 h-4 text-brand" />
                <span>256-Bit Encrypted Dark Store Dispatch</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. STORE MAINTENANCE MODAL */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-[120] bg-ink/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border-2 border-brand/20 shadow-2xl text-center space-y-5 relative">
            <button
              onClick={() => setShowMaintenanceModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-ink-subtle text-ink-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-yellow text-ink flex items-center justify-center mx-auto border border-yellow-hover">
              <AlertTriangle className="w-7 h-7 text-ink" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand block">
                DARK STORE INVENTORY UPGRADE
              </span>
              <h3 className="font-display font-bold text-2xl text-ink">
                GLOW VAI Store is Under Maintenance
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                We are currently restocking our Vijayawada Dark Store micro-hubs with fresh Minimalist & The Derma Co inventory and upgrading 15-minute rider dispatch systems. Online ordering will resume shortly!
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/face-analysis" onClick={() => { setShowMaintenanceModal(false); onClose(); }}>
                <Button variant="primary" size="md" className="w-full gap-2 bg-brand hover:bg-brand-dark text-white font-bold text-xs py-3">
                  <Sparkles className="w-4 h-4 text-yellow" />
                  <span>Start Free AI Face Scan</span>
                </Button>
              </Link>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-ink/15 text-ink font-bold text-xs hover:bg-ink-subtle transition-colors"
              >
                Close & Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
