import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ScanLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PRIVACY_SHORT } from "@/config/privacy-copy";
import { HERO_SLIDES } from "@/config/hero-art";
import { HeroSlides } from "./HeroSlides";
import { focusRing } from "./shared";
import { Hero3D } from "./hero3d/Hero3D";
import { Botanical } from "./hero3d/Botanical";
import { getAssetPath } from "@/lib/utils";

// Alternate headlines kept ready (not rendered):
// B: "Skincare that starts with a selfie."  C: "Scan today. Glow by tonight."

const AVATARS = [
  "/images/face-scan/indian_female.png",
  "/images/face-scan/indian_male.png",
  "/images/founders/nalla-satvik.jpg",
  "/images/founders/rahimath.jpeg",
];

// A deep blue night. Colour layers only, so the words stay readable on any phone.
const HERO_BG =
  "radial-gradient(1100px 680px at 76% 44%, rgba(43,91,255,0.95) 0%, rgba(20,71,230,0.5) 32%, rgba(11,47,158,0) 64%)," +
  "radial-gradient(900px 520px at 6% 100%, rgba(124,245,200,0.18), rgba(124,245,200,0) 62%)," +
  "linear-gradient(180deg, #0B2F9E 0%, #081C63 48%, #050C2B 100%)";

export function HomeHero({ city = "Vijayawada" }: { city?: string }) {
  const hasArt = HERO_SLIDES.length > 0;
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden text-white lg:min-h-[min(calc(100svh-44px),900px)] lg:flex lg:items-center"
      style={{ background: HERO_BG }}
    >
      {hasArt ? (
        <HeroSlides slides={HERO_SLIDES} />
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <Botanical className="h-[64%] w-auto opacity-60 hidden sm:block" />
          <Botanical flip className="h-[56%] w-auto opacity-55 hidden lg:block" />
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 0.8px)", backgroundSize: "46px 46px", maskImage: "radial-gradient(closest-side at 70% 40%, #000, transparent)", WebkitMaskImage: "radial-gradient(closest-side at 70% 40%, #000, transparent)" }}
          />
        </div>
      )}

      <div className="relative z-10 w-full gv-page pb-10 pt-7 sm:pb-12 sm:pt-12 lg:pb-12 lg:pt-[calc(76px+2rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          <div className="lg:col-span-6">
            <h1
              id="hero-title"
              className="font-display font-semibold text-[clamp(2.75rem,1.3rem+3.4vw,4.5rem)] leading-[1] tracking-[-0.035em] bg-gradient-to-r from-white to-[#A9BEFF] bg-clip-text text-transparent max-w-[680px]"
            >
              Know your skin.
              <br /> Fix it in <span className="text-[#7CF5C8] whitespace-nowrap">15 minutes.</span>
            </h1>

            <p className="mt-7 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-white/80 max-w-[44ch]">
              A 30-second face scan, then your routine at your door in {city}.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-4">
              <ButtonLink
                href="/face-analysis"
                data-track="scan_cta_click"
                data-track-location="hero"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto border-transparent shadow-[0_18px_40px_-16px_rgba(124,245,200,0.55)] hover:bg-[#EAF0FF]"
              >
                <ScanLine className="w-5 h-5" aria-hidden="true" />
                <span>Scan my face, free</span>
              </ButtonLink>
              <Link
                href="/shop"
                data-track="shop_cta_click"
                data-track-location="hero"
                className={`inline-flex min-h-11 items-center gap-2 font-medium text-white underline underline-offset-[5px] decoration-white/40 hover:decoration-white rounded ${focusRing}`}
              >
                <span>or browse the shop</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-3 text-[15px] text-white/65">Takes about 30 seconds. Face a window.</p>

            {/* Customer avatars & social proof */}
            <div className="mt-7 flex items-center gap-4">
              <div className="flex -space-x-2.5 overflow-hidden">
                {AVATARS.map((src) => (
                  <div key={src} className="relative w-9 h-9 rounded-full ring-2 ring-[#0B2F9E] overflow-hidden bg-white/20 shrink-0">
                    <Image src={getAssetPath(src)} alt="Customer scan avatar" fill sizes="36px" className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-xs text-white/75">
                <div className="flex items-center gap-1 font-semibold text-white">
                  <span className="text-[#FFC93C]">★★★★★</span>
                  <span>4.9 / 5.0</span>
                </div>
                <p className="text-[12px] text-white/65">Over 1,200+ scans completed in {city}</p>
              </div>
            </div>

            <p className="mt-8 pt-5 border-t border-white/20 font-mono text-[13px] leading-relaxed text-white/70">
              Free scan &middot; {PRIVACY_SHORT} &middot; About 15 min delivery in {city}
            </p>
          </div>

          {hasArt ? null : (
            <div className="lg:col-span-6">
              <Hero3D tone="dark" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
