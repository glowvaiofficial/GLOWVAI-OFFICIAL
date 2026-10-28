import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, Eyebrow, SectionTitle } from "./shared";
import { MEDICAL_NOTE } from "@/config/privacy-copy";
import { howSteps, scanTips } from "@/config/home-content";

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

      <ol className="border-t border-ink/20">
        {howSteps.map((step) => (
          <li
            key={step.title}
            className="grid grid-cols-[88px_1fr] md:grid-cols-12 gap-x-6 gap-y-2 py-7 sm:py-9 border-b border-ink/20 items-baseline"
          >
            <span className="md:col-span-2 font-mono text-xl sm:text-2xl text-brand [font-feature-settings:'tnum']">
              <span className="sr-only">At </span>
              {step.stamp}
            </span>
            <h3 className="md:col-span-4 font-display font-semibold text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-tight text-ink">
              {step.title}
            </h3>
            <p className="col-start-2 md:col-start-auto md:col-span-6 text-ink-muted max-w-[52ch]">{step.body}</p>
          </li>
        ))}
      </ol>

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
