"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { footerLinks, routesReady } from "@/config/nav";
import { trustStripClaimsList } from "@/config/claims";
import { Container } from "@/components/ui/Container";
import { MapPin, ArrowUp, Mail, Phone, Sparkles } from "lucide-react";
import { getAssetPath } from "@/lib/utils";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isMadeInIndiaVerified = trustStripClaimsList.find(
    (c) => c.id === "madeInIndia"
  )?.verified ?? true;

  const filterLinks = (links: { title: string; href: string }[]) => {
    return links.filter((link) => {
      if (link.href.startsWith("#") || link.href.includes("#") || link.href.includes("?")) return true;
      const basePath = link.href.split("?")[0];
      return routesReady[basePath] === true || routesReady[link.href] === true;
    });
  };

  const filteredShop = filterLinks(footerLinks.shop);
  const filteredCompany = filterLinks(footerLinks.company);
  const filteredHelp = filterLinks(footerLinks.help);
  const filteredLegal = filterLinks(footerLinks.legal);

  return (
    <footer className="bg-ink text-white pt-16 sm:pt-24 pb-12 relative border-t border-white/10 overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-yellow/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <Container>
        {/* Top Vibrant Call-To-Action Banner */}
        <div className="mb-16 p-6 sm:p-10 rounded-[32px] bg-gradient-to-r from-brand-light via-brand to-brand-dark text-white shadow-2xl border border-brand-light/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <span className="text-xs font-semibold text-yellow uppercase tracking-widest block flex items-center gap-1.5 justify-center md:justify-start">
              <Sparkles className="w-4 h-4 text-yellow" />
              Instant AI Face Scanner & Quick Commerce
            </span>
            <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight text-white">
              Ready to know what your skin is asking for?
            </h3>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              Take a 30-second scan right in your browser. Get a plain-language report delivered in 15 minutes across Vijayawada.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link href="/face-analysis">
              <button className="px-6 py-3.5 bg-yellow hover:bg-yellow-hover text-ink font-bold text-sm rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-98 flex items-center gap-2 cursor-pointer">
                <span>Start free scan</span>
                <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
              </button>
            </Link>
            <a href="tel:+918977855998" className="px-5 py-3.5 bg-white/15 backdrop-blur-md text-white font-bold text-sm rounded-2xl border border-white/30 hover:bg-white/25 transition-all flex items-center gap-2">
              <Phone className="w-4 h-4 text-yellow" />
              <span>+91 89778 55998</span>
            </a>
          </div>
        </div>

        {/* Main Footer Grid (6 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Info & Contact Block (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 group focus-visible:outline-none"
            >
              <span className="font-display font-bold text-3xl tracking-tight text-white group-hover:text-brand-light transition-colors">
                GLOW VAI
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-ink uppercase bg-yellow px-2.5 py-1 rounded-lg shadow-sm">
                Quick Commerce
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm font-normal">
              Skincare that starts with a selfie. Formulated for Indian weather, 15-minute doorstep express dark store delivery, on-device privacy.
            </p>

            {/* Direct Contact Links */}
            <div className="space-y-2 text-xs text-white/80 pt-1 font-semibold">
              <a
                href="mailto:contact@glowvai.in"
                className="flex items-center gap-2.5 hover:text-brand-light transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-brand-light group-hover:bg-brand group-hover:text-white transition-colors border border-white/10">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span>contact@glowvai.in</span>
              </a>

              <a
                href="tel:+918977855998"
                className="flex items-center gap-2.5 hover:text-brand-light transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-brand-light group-hover:bg-brand group-hover:text-white transition-colors border border-white/10">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>+91 89778 55998</span>
              </a>

              <div className="flex items-center gap-2.5 text-white/70 pt-0.5">
                <div className="w-7 h-7 rounded-lg bg-yellow/20 flex items-center justify-center text-yellow border border-yellow/30">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span>Vijayawada & Visakhapatnam, Andhra Pradesh, India</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center space-x-3 pt-2">
              {siteConfig.socials.instagram && (
                <a
                  href={siteConfig.socials.instagram}
                  target="_blank"
                  rel="me noopener"
                  aria-label="GLOW VAI Instagram"
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-gradient-to-tr hover:from-yellow hover:to-coral hover:text-white transition-all transform hover:scale-110 shadow-xs border border-white/10"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {siteConfig.socials.twitter && (
                <a
                  href={siteConfig.socials.twitter}
                  target="_blank"
                  rel="me noopener"
                  aria-label="GLOW VAI X"
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white hover:text-ink transition-all transform hover:scale-110 shadow-xs border border-white/10"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
              {siteConfig.socials.linkedin && (
                <a
                  href={siteConfig.socials.linkedin}
                  target="_blank"
                  rel="me noopener"
                  aria-label="GLOW VAI LinkedIn"
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-brand hover:text-white transition-all transform hover:scale-110 shadow-xs border border-white/10"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Shop Column */}
          {filteredShop.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-yellow tracking-widest uppercase">Shop</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/70 font-medium">
                {filteredShop.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="hover:text-brand-light transition-colors block py-0.5">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Company Column */}
          {filteredCompany.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-yellow tracking-widest uppercase">Company</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/70 font-medium">
                {filteredCompany.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="hover:text-brand-light transition-colors block py-0.5">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Help Column */}
          {filteredHelp.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-yellow tracking-widest uppercase">Help & Info</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/70 font-medium">
                {filteredHelp.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="hover:text-brand-light transition-colors block py-0.5">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legal Column */}
          {filteredLegal.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-yellow tracking-widest uppercase">Legal & Privacy</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/70 font-medium">
                {filteredLegal.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="hover:text-brand-light transition-colors block py-0.5">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom copyright & badges */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60 font-medium">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {currentYear} {BRAND_NAME} Quick-Commerce. All rights reserved.</span>
            {isMadeInIndiaVerified && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-white/80">
                  <MapPin className="w-3.5 h-3.5 text-brand-light shrink-0" />
                  <span>Made in Andhra Pradesh, India</span>
                </span>
              </>
            )}
          </div>

          <div className="text-[11px] font-semibold text-white/80 bg-white/10 px-3.5 py-1 rounded-full border border-white/10">
            Cosmetic skin insights, not medical advice.
          </div>
        </div>
      </Container>

      {/* Back To Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-24 right-6 w-10 h-10 rounded-full bg-brand text-white shadow-xl flex items-center justify-center border-2 border-white hover:scale-110 transition-all z-40 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </footer>
  );
}
