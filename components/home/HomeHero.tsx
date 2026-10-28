import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PRIVACY_SHORT } from "@/config/privacy-copy";
import { getAssetPath } from "@/lib/utils";
import { focusRing } from "./shared";

// Alternate headlines kept ready (not rendered):
// B: "Skincare that starts with a selfie."  C: "Scan today. Glow by tonight."

function ScanOverlay() {
  return (
    <svg
      role="img"
      aria-label="Illustration of a face being scanned on a phone"
      viewBox="0 0 200 400"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="none" stroke="#7CF5C8" strokeLinecap="round">
        <ellipse cx="100" cy="165" rx="56" ry="74" strokeWidth="2.5" />
        <ellipse cx="100" cy="165" rx="38" ry="52" strokeWidth="1.2" opacity=".45" />
        <path d="M100 91 V239 M44 165 H156" strokeWidth="1.2" opacity=".45" />
      </g>
      <g fill="#7CF5C8">
        <circle cx="78" cy="140" r="4" />
        <circle cx="122" cy="140" r="4" />
        <circle cx="100" cy="170" r="4" />
        <circle cx="82" cy="205" r="4" />
        <circle cx="118" cy="205" r="4" />
      </g>
      <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 70 V50 a8 8 0 0 1 8 -8 H52" />
        <path d="M148 42 H168 a8 8 0 0 1 8 8 V70" />
        <path d="M24 290 V310 a8 8 0 0 0 8 8 H52" />
        <path d="M148 318 H168 a8 8 0 0 0 8 -8 V290" />
      </g>
    </svg>
  );
}

function PhoneVisual() {
  return (
    <div className="relative w-[58%] min-[480px]:w-[min(280px,60%)] lg:w-[min(320px,66%)] aspect-[9/19] rounded-[40px] border-8 border-ink bg-ink">
      <div aria-hidden="true" className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[90px] h-[22px] rounded-full bg-ink z-20" />
      <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-ink">
        <Image
          src={getAssetPath("/images/hero/face-scan-selfie.webp")}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 60vw, 320px"
          className="object-cover opacity-90"
        />
        <ScanOverlay />
        <div aria-hidden="true" className="gv-scan-line" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 p-4 bg-ink/75">
          <p className="font-mono text-xs text-white/80 mb-2">Scanning... 0:12</p>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-[3px] ${i < 2 ? "bg-[#7CF5C8]" : "bg-white/25"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeHero({ city = "Vijayawada" }: { city?: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-paper pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-[72px] lg:pb-24 lg:min-h-[640px] flex items-center overflow-hidden"
    >
      <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <div className="lg:col-span-7">
            <h1
              id="hero-title"
              className="font-display font-semibold text-[clamp(2.75rem,1.6rem+5.2vw,5.5rem)] leading-[0.98] tracking-[-0.035em] text-ink"
            >
              Know your skin.
              <br className="hidden lg:block" /> Fix it in <span className="text-brand">15 minutes.</span>
            </h1>

            <p className="mt-7 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[44ch]">
              A 30-second face scan, then your routine at your door in {city}.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-4">
              <Link href="/face-analysis" data-track="scan_cta_click" data-track-location="hero">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  <ScanLine className="w-5 h-5" aria-hidden="true" />
                  <span>Scan my face, free</span>
                </Button>
              </Link>
              <Link
                href="/shop"
                data-track="shop_cta_click"
                data-track-location="hero"
                className={`inline-flex items-center gap-2 font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
              >
                <span>or browse the shop</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-3 text-[15px] text-ink-light">Takes about 30 seconds. Face a window.</p>

            <p className="mt-12 pt-6 border-t border-ink/15 font-mono text-[13px] leading-relaxed text-ink-muted">
              Free scan &middot; {PRIVACY_SHORT} &middot; About 15 min delivery in {city}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-[520px] lg:h-[680px] w-full max-w-[520px] mx-auto">
              <div aria-hidden="true" className="absolute inset-[6%_6%_6%_10%] rounded-[24px] bg-paper-deep" />

              <div className="absolute inset-0 flex items-center justify-center">
                <PhoneVisual />
              </div>

              <div
                aria-hidden="true"
                className="absolute top-[8%] left-0 w-[170px] sm:w-[210px] -rotate-3 bg-white border border-ink/15 rounded-[10px] p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Sample report</p>
                <p className="mt-2 font-display font-semibold text-[44px] leading-none text-ink [font-feature-settings:'tnum']">
                  84
                </p>
                <p className="mt-1 text-xs text-ink-muted">Barrier strong</p>
                <div className="mt-3 flex justify-between font-mono text-[11px] text-ink-muted">
                  <span>Hydration depth</span>
                  <span className="text-ink">92%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-[3px] bg-ink/10 overflow-hidden">
                  <div className="h-full w-[92%] bg-brand" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
