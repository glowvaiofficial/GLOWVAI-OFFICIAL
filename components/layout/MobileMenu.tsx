"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { navLinks } from "@/config/nav";
import { BRAND_NAME } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { X, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  cartCount,
  onOpenCart,
}: MobileMenuProps) {
  // Lock body scroll and trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-[100] bg-white flex flex-col justify-between p-6 animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 select-none"
        >
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl tracking-tight text-brand">
              GLOW VAI
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-ink uppercase bg-yellow/30 px-2 py-0.5 rounded-md border border-yellow-hover">
              Quick Commerce
            </span>
          </div>
        </Link>

        <button
          onClick={onClose}
          aria-label="Close menu"
          className="w-10 h-10 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Links */}
      <nav className="flex flex-col space-y-5 my-auto py-6">
        {navLinks.map((link) => {
          const isExternal = link.href.startsWith("http");
          return isExternal ? (
            <a
              key={link.title}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="group flex items-center justify-between font-display text-2xl font-bold text-ink hover:text-brand transition-colors py-1"
            >
              <span>{link.title}</span>
              <div className="flex items-center gap-2">
                {link.badge && (
                  <span className="text-xs bg-mint text-ink font-semibold px-2.5 py-0.5 rounded-full border border-mint">
                    {link.badge}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-ink/30 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          ) : (
            <Link
              key={link.title}
              href={link.href}
              onClick={onClose}
              className="group flex items-center justify-between font-display text-2xl font-bold text-ink hover:text-brand transition-colors py-1"
            >
              <span>{link.title}</span>
              <div className="flex items-center gap-2">
                {link.badge && (
                  <span className="text-xs bg-blush text-ink font-semibold px-2.5 py-0.5 rounded-full border border-coral/20">
                    {link.badge}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-ink/30 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Action Area & Contact Info */}
      <div className="space-y-3 pt-4 border-t border-ink/10">
        <Link href="/face-analysis" onClick={onClose} className="block w-full">
          <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2 shadow-coral-glow">
            <Sparkles className="w-5 h-5" />
            <span>Scan My Face (Free)</span>
          </Button>
        </Link>

        <button
          onClick={() => {
            onClose();
            onOpenCart();
          }}
          className="w-full flex items-center justify-center gap-2 bg-skymist text-brand font-bold py-3.5 px-4 rounded-2xl border border-brand/20"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>View Cart ({cartCount})</span>
        </button>

        {/* Contact & Social Links in Mobile Drawer */}
        <div className="pt-2 text-center space-y-1.5 text-xs text-ink-muted">
          <div className="flex justify-center items-center gap-4">
            <a href="tel:+918977855998" className="font-bold text-ink hover:text-brand">
              +91 89778 55998
            </a>
            <span>•</span>
            <a href="mailto:contact@glowvai.in" className="font-bold text-ink hover:text-brand">
              contact@glowvai.in
            </a>
          </div>

          <div className="flex justify-center items-center gap-3 pt-1">
            <a
              href="https://www.instagram.com/glowvai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-skymist flex items-center justify-center text-ink hover:bg-brand hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://x.com/Glowvai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-skymist flex items-center justify-center text-ink hover:bg-brand hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/glowvai/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-skymist flex items-center justify-center text-ink hover:bg-brand hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
