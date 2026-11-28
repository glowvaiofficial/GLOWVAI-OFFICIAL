"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { navLinks } from "@/config/nav";
import { BRAND_NAME } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { ShoppingBag, Menu } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { cn, getAssetPath } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";

function GlowVaiLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none group">
      <Image src={getAssetPath(light ? "/brand/glowvai-wordmark-white.png" : "/brand/glowvai-wordmark.png")} alt="GLOW VAI" width={132} height={35} priority className="h-8 w-auto" />
      <span className={cn("hidden min-[480px]:inline md:hidden lg:inline text-xs font-semibold tracking-widest uppercase border px-2 py-0.5 rounded-full transition-colors duration-300", light ? "text-white border-white/70" : "text-ink border-ink")}>
        Quick commerce
      </span>
    </div>
  );
}

const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const openCart = useCartStore((s) => s.openCart);

  const cartItems = useCartStore((s) => s.items);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // On the home page the bar sits over the dark hero picture: transparent with white text at the top, solid white once the page scrolls.
  // Every other page keeps the normal white bar.
  const overHero = pathname === "/";
  const onHero = overHero && !isScrolled;

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
          "sticky top-0 z-40 w-full border-b flex items-center transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          // On the home page the bar keeps one height and the page slides up under it, so nothing jumps when it changes colour.
          overHero ? "min-h-16 lg:min-h-[76px] -mb-16 lg:-mb-[76px]" : isScrolled ? "min-h-16" : "min-h-16 lg:min-h-[76px]",
          onHero ? "bg-transparent border-transparent" : "bg-white border-ink/10"
        )}
      >
        <div className="w-full gv-page flex items-center justify-between gap-4">
          <Link
            href="/"
            className={cn("-ml-1 p-1 rounded-lg min-h-11 inline-flex items-center", focusRing)}
          >
            <GlowVaiLogo light={onHero} />
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-3" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 text-sm lg:text-[15px] font-medium transition-colors rounded-lg",
                  onHero ? "text-white hover:text-white/75" : "text-ink hover:text-brand",
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
                "relative w-[46px] h-[46px] inline-flex items-center justify-center rounded-[10px] border-[1.5px] transition-colors cursor-pointer",
                onHero ? "border-white/45 text-white hover:border-white" : "border-ink/20 text-ink hover:border-ink",
                focusRing
              )}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-white font-semibold text-xs flex items-center justify-center ring-2 ring-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              <ButtonLink href="/face-analysis" data-track="scan_cta_click" data-track-location="nav" variant={onHero ? "secondary" : "dark"} size="sm">
                  <span>Scan my face</span>
                </ButtonLink>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className={cn(
                "md:hidden w-[46px] h-[46px] inline-flex items-center justify-center rounded-[10px] transition-colors cursor-pointer",
                onHero ? "text-white hover:bg-white/10" : "text-ink hover:bg-paper-deep",
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
