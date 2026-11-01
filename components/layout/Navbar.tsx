"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Boxes, CircleUserRound, Home, Menu, RotateCcw, ScanLine, ShoppingCart } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { cn, getAssetPath } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";

const focusRing = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";

const shoppingNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/shop", icon: Boxes },
  { label: "Skin scan", href: "/face-analysis", icon: ScanLine },
  { label: "Orders", href: "/track-order", icon: RotateCcw },
  { label: "Account", href: "/contact", icon: CircleUserRound },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const openCart = useCartStore((state) => state.openCart);
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("gv:open-cart", openCart);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("gv:open-cart", openCart);
    };
  }, [openCart]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-ink">Skip to main content</a>
      <header className={cn("sticky top-0 z-40 flex w-full items-center border-b border-[#e3e7f0] bg-white/95 backdrop-blur-xl transition-[min-height,box-shadow]", isScrolled ? "min-h-16 shadow-[0_8px_28px_rgba(28,47,90,.07)]" : "min-h-[72px]")}>
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
          <Link href="/" className={cn("flex items-center gap-2 rounded-lg", focusRing)} aria-label="Glowvai home">
            <span className="relative h-9 w-9 overflow-hidden rounded-[10px]">
              <Image src={getAssetPath("/logo/glowvai-logo.svg")} alt="" fill priority sizes="36px" className="object-contain" />
            </span>
            <span className="font-display text-[26px] font-bold leading-none tracking-[-.04em] text-brand">glowvai</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {shoppingNav.map(({ label, href, icon: Icon }, index) => (
              <Link key={label} href={href} className={cn("inline-flex min-h-11 items-center gap-2 rounded-[14px] px-3.5 text-[14px] font-medium text-[#2f3a52] transition hover:bg-[#f1f5ff] hover:text-brand", index === 0 && "bg-[#eaf1ff] text-brand", focusRing)}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openCart()} aria-label={"Cart, " + cartItemCount + " items"} className={cn("relative hidden min-h-12 items-center gap-2 rounded-[16px] bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark sm:inline-flex", focusRing)}>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" /> Cart
              {cartItemCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-brand">{cartItemCount}</span>}
            </button>
            <button type="button" onClick={() => openCart()} aria-label={"Cart, " + cartItemCount + " items"} className={cn("relative grid h-11 w-11 place-items-center rounded-xl bg-brand text-white sm:hidden", focusRing)}>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartItemCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff4d61] px-1 text-[10px] font-bold text-white ring-2 ring-white">{cartItemCount}</span>}
            </button>
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation menu" className={cn("grid h-11 w-11 place-items-center rounded-xl text-[#17233c] hover:bg-[#f1f5ff] lg:hidden", focusRing)}>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} cartCount={cartItemCount} onOpenCart={() => openCart()} />
      <CartDrawer />
    </>
  );
}
