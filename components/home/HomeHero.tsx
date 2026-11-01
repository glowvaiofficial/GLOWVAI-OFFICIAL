import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PRIVACY_SHORT } from "@/config/privacy-copy";
import { focusRing } from "./shared";
import { PhoneDemo } from "./PhoneDemo";
import { getAssetPath } from "@/lib/utils";

// Alternate headlines kept ready (not rendered):
// B: "Skincare that starts with a selfie."  C: "Scan today. Glow by tonight."

export function HomeHero({ city = "Vijayawada" }: { city?: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-paper pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-8 lg:pb-8 lg:min-h-[calc(100svh-120px)] flex items-center overflow-hidden"
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

            {/* Customer avatars & social proof */}
            <div className="mt-7 flex items-center gap-4">
              <div className="flex -space-x-2.5 overflow-hidden">
                <div className="relative w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-paper-deep shrink-0">
                  <Image
                    src={getAssetPath("/images/face-scan/indian_female.png")}
                    alt="Customer scan avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="relative w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-paper-deep shrink-0">
                  <Image
                    src={getAssetPath("/images/face-scan/indian_male.png")}
                    alt="Customer scan avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="relative w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-paper-deep shrink-0">
                  <Image
                    src={getAssetPath("/images/founders/nalla-satvik.jpg")}
                    alt="Customer scan avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="relative w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-paper-deep shrink-0">
                  <Image
                    src={getAssetPath("/images/founders/rahimath.jpeg")}
                    alt="Customer scan avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="text-xs text-ink-muted">
                <div className="flex items-center gap-1 font-semibold text-ink">
                  <span className="text-[#E69014]">★★★★★</span>
                  <span>4.9 / 5.0</span>
                </div>
                <p className="text-[12px] text-ink-light">Over 1,200+ scans completed in {city}</p>
              </div>
            </div>

            <p className="mt-8 pt-5 border-t border-ink/15 font-mono text-[13px] leading-relaxed text-ink-muted">
              Free scan &middot; {PRIVACY_SHORT} &middot; About 15 min delivery in {city}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative w-full max-w-[520px] mx-auto flex justify-center">
              <PhoneDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
