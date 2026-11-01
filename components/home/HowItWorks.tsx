import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, Eyebrow, SectionTitle } from "./shared";
import { MEDICAL_NOTE } from "@/config/privacy-copy";
import { howSteps, scanTips } from "@/config/home-content";
import { getAssetPath } from "@/lib/utils";

const stepImages = [
  {
    image: "/images/face-analysis/camera_scan.png",
    alt: "AI camera scan checking skin in 30 seconds",
  },
  {
    image: "/images/face-analysis/glow_results.png",
    alt: "Plain-language skin score breakdown",
  },
  {
    image: "/images/home-ai/express_delivery.png",
    alt: "Routine delivered in about 15 minutes by rider",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="deep" labelledBy="how-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 mb-10 lg:mb-14">
        <div className="lg:col-span-7 space-y-5">
          <Eyebrow>Free face scan &middot; 0:00 to 15:00</Eyebrow>
          <SectionTitle id="how-title">No quiz. Just a selfie and 30 seconds.</SectionTitle>
        </div>
        <p className="lg:col-span-5 lg:self-end text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted">
          We look at hydration, texture, tone and clarity, then show you what your skin is asking for.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {howSteps.map((step, idx) => {
          const img = stepImages[idx];
          return (
            <div
              key={step.title}
              className="bg-white border border-ink/15 rounded-[20px] overflow-hidden flex flex-col group hover:border-brand/40 transition-colors shadow-2xs"
            >
              <div className="relative aspect-[16/10] w-full bg-paper overflow-hidden border-b border-ink/10">
                <Image
                  src={getAssetPath(img.image)}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-brand font-mono font-semibold text-xs px-2.5 py-1 rounded-[6px] shadow-2xs">
                  {step.stamp}
                </span>
              </div>
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-light">Step 0{idx + 1}</span>
                  <h3 className="mt-1 font-display font-semibold text-2xl text-ink leading-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-ink-muted text-[15px] leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-4">
        <Link href="/face-analysis" data-track="scan_cta_click" data-track-location="how_it_works">
          <Button variant="primary" size="lg" className="w-full sm:w-auto">
            <span>Start free scan</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Button>
        </Link>
        <a
          href="#what-we-check"
          className="font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          How the scan works
        </a>
      </div>

      <p className="mt-6 text-sm text-ink-light max-w-[62ch]">
        Before you scan:{" "}
        {scanTips.map((t, i) => (
          <span key={t.label}>
            {t.label}
            {i < scanTips.length - 1 ? " · " : "."}
          </span>
        ))}{" "}
        {MEDICAL_NOTE} Lighting and camera quality affect results.
      </p>
    </Section>
  );
}
