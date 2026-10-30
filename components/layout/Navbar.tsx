"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { navLinks } from "@/config/nav";
import { BRAND_NAME } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, Menu } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";

function GlowVaiLogo() {
  return (
    <div className="flex items-center gap-2.5 select-none group">
      <span className="font-display font-bold text-[26px] leading-none tracking-[-0.02em] text-brand group-hover:text-brand-dark transition-colors">
        GLOW VAI
      </span>
      <span className="hidden min-[480px]:inline text-[10px] font-semibold tracking-widest text-ink uppercase border border-ink px-2 py-0.5 rounded-full">
        Quick commerce
      </span>
    </div>
  );
}

const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const openCart = useCartStore((s) => s.openCart);

  const cartItems = useCartStore((s) => s.items);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("gv:open-cart", openCart);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("gv:open-cart", openCart);
    };
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:bg-white focus:text-ink focus:px-4 focus:py-3 focus:rounded-[10px] focus:border-2 focus:border-brand"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-white border-b border-ink/10 flex items-center transition-[min-height]",
          isScrolled ? "min-h-16" : "min-h-16 lg:min-h-[76px]"
        )}
      >
        <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
          <Link
            href="/"
            className={cn("-ml-1 p-1 rounded-lg", focusRing)}
            aria-label={`${BRAND_NAME} home`}
          >
            <GlowVaiLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-3" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 text-[15px] font-medium text-ink hover:text-brand transition-colors rounded-lg",
                  focusRing
                )}
              >
                {link.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => openCart()}
              aria-label={`Cart, ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
              className={cn(
                "relative w-[46px] h-[46px] inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-ink/20 text-ink hover:border-ink transition-colors cursor-pointer",
                focusRing
              )}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-white font-semibold text-[11px] flex items-center justify-center ring-2 ring-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              <Link href="/face-analysis" data-track="scan_cta_click" data-track-location="nav">
                <Button variant="dark" size="sm">
                  <span>Scan my face</span>
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className={cn(
                "md:hidden w-[46px] h-[46px] inline-flex items-center justify-center rounded-[10px] text-ink hover:bg-paper-deep transition-colors cursor-pointer",
                focusRing
              )}
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        cartCount={cartItemCount}
        onOpenCart={() => openCart()}
      />

      <CartDrawer />
    </>
  );
}
