import React from "react";
import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PRIVACY_SHORT } from "@/config/privacy-copy";
import { focusRing } from "./shared";
import { PhoneDemo } from "./PhoneDemo";

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

            <p className="mt-8 pt-5 border-t border-ink/15 font-mono text-[13px] leading-relaxed text-ink-muted">
              Free scan &middot; {PRIVACY_SHORT} &middot; About 15 min delivery in {city}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative w-full max-w-[520px] mx-auto flex justify-center">
              <PhoneDemo />

              <div
                aria-hidden="true"
                className="hidden sm:block absolute top-[12%] left-0 lg:left-2 w-[160px] -rotate-3 bg-white border border-ink/15 rounded-[10px] p-4"
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
