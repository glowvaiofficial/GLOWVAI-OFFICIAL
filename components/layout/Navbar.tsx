"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { navLinks } from "@/config/nav";
import { BRAND_NAME } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Sparkles, ShoppingBag, Search, Menu } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { CartDrawer } from "./CartDrawer";
import { cn, getAssetPath } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";

function GlowVaiLogo() {
  return (
    <div className="flex items-center gap-2 select-none group">
      <div className="flex items-baseline gap-1.5">
        <span className="font-display font-bold text-2xl tracking-tight text-brand group-hover:text-brand-dark transition-colors">
          GLOW VAI
        </span>
        <span className="text-[10px] font-semibold tracking-widest text-ink uppercase bg-yellow/30 px-2 py-0.5 rounded-md border border-yellow-hover shadow-2xs">
          Quick Commerce
        </span>
      </div>
    </div>
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartItems = useCartStore((s) => s.items);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300",
          isScrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-ink/10 shadow-md py-2.5 sm:py-3"
            : "bg-white/90 backdrop-blur-md py-3 sm:py-3.5 border-b border-ink/5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo (~120px wide SVG) */}
          <Link
            href="/"
            className="group flex items-center p-1 -ml-1 rounded-2xl hover:opacity-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label={`${BRAND_NAME} Home`}
          >
            <GlowVaiLogo />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isExternal = link.href.startsWith("http");
              return isExternal ? (
                <a
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative px-3.5 py-2 text-[14px] font-bold text-ink/80 hover:text-brand hover:bg-skymist/70 rounded-xl transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span>{link.title}</span>
                  {link.badge && (
                    <span className="text-[10px] font-semibold bg-mint text-ink px-2 py-0.5 rounded-full shadow-2xs border border-ink/10 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </a>
              ) : (
                <Link
                  key={link.title}
                  href={link.href}
                  className="relative px-3.5 py-2 text-[14px] font-bold text-ink/80 hover:text-brand hover:bg-skymist/70 rounded-xl transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span>{link.title}</span>
                  {link.badge && (
                    <span className="text-[10px] font-semibold bg-coral text-ink px-2 py-0.5 rounded-full shadow-2xs border border-white/40 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons & Primary CTA */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Shopping Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping cart with ${cartItemCount} items`}
              className="relative p-2.5 rounded-xl text-ink/80 hover:text-brand hover:bg-skymist/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand group"
            >
              <ShoppingBag className="w-5 h-5 text-ink group-hover:scale-110 transition-transform" />
              {cartItemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-coral text-ink font-bold text-[11px] flex items-center justify-center shadow-xs ring-2 ring-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Scan My Face Primary Action Button */}
            <div className="hidden sm:block">
              <Link href="/face-analysis">
                <Button variant="primary" size="md" className="gap-2 shadow-coral-glow hover:scale-[1.03] transition-transform text-button-label font-bold rounded-xl px-4 py-2 text-xs">
                  <Sparkles className="w-4 h-4 text-ink animate-spin-slow" />
                  <span>Scan my face</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="md:hidden p-2.5 rounded-xl text-ink hover:bg-skymist/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu & Cart Drawer Modals */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        cartCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </>
  );
}
