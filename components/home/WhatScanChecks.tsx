import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { Section, SectionTitle, focusRing } from "./shared";
import { PRIVACY_LEAD, PRIVACY_EMAIL, MEDICAL_NOTE } from "@/config/privacy-copy";
import { scanMarkers, scanPrivacyChecks, sampleScores } from "@/config/home-content";
import { getAssetPath } from "@/lib/utils";

export function WhatScanChecks() {
  return (
    <Section id="what-we-check" labelledBy="checks-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
        {/* Oversized numeral: the one big typographic moment */}
        <div className="lg:col-span-4">
          <p
            aria-hidden="true"
            className="font-display font-semibold text-[clamp(7rem,5rem+12vw,13rem)] leading-[0.8] tracking-[-0.06em] text-brand [font-feature-settings:'tnum']"
          >
            30
          </p>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-ink-muted">seconds, start to finish</p>
          <div className="relative mt-8 aspect-[4/3] w-full max-w-[360px] rounded-[24px] overflow-hidden border border-ink/15">
            <Image
              src={getAssetPath("/images/home-ai/ai_scan.png")}
              alt="Person holding a phone showing a face scan"
              fill
              sizes="(max-width: 1024px) 90vw, 360px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-8">
          <SectionTitle id="checks-title">Four markers. Thirty seconds.</SectionTitle>
          <p className="mt-4 text-ink-muted max-w-[52ch]">Each marker gets a plain-language score and one clear next step.</p>

          <table className="mt-8 w-full text-left border-collapse">
            <caption className="sr-only">What the scan checks, with example scores</caption>
            <thead>
              <tr className="border-b border-ink text-ink">
                <th scope="col" className="py-3 pr-4 font-mono text-xs uppercase tracking-[0.12em] font-medium">
                  Marker
                </th>
                <th scope="col" className="py-3 pr-4 font-mono text-xs uppercase tracking-[0.12em] font-medium">
                  What it looks at
                </th>
                <th scope="col" className="py-3 font-mono text-xs uppercase tracking-[0.12em] font-medium text-right">
                  Example
                </th>
              </tr>
            </thead>
            <tbody>
              {scanMarkers.map((m, i) => {
                const sample = sampleScores[i];
                return (
                  <tr key={m.title} className="border-b border-ink/15 align-top">
                    <th scope="row" className="py-5 pr-4 font-display font-semibold text-xl text-ink">
                      {m.title}
                    </th>
                    <td className="py-5 pr-4 text-ink-muted">{m.body}</td>
                    <td className="py-5 w-[112px] text-right">
                      <span className="font-mono text-lg text-ink [font-feature-settings:'tnum']">{sample.value}</span>
                      <div
                        role="progressbar"
                        aria-label={`${m.title} example score`}
                        aria-valuenow={sample.value}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-2 h-1.5 bg-ink/10 overflow-hidden rounded-[3px]"
                      >
                        <div className="h-full bg-brand" style={{ width: `${sample.value}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-ink-light">Example values for illustration.</p>

          <div className="mt-6 flex items-center gap-4 border border-ink/15 rounded-[10px] bg-white p-3">
            <div className="relative w-16 h-16 shrink-0 rounded-[10px] bg-paper overflow-hidden">
              <Image
                src={getAssetPath("/images/hero/product.webp")}
                alt="Example serum bottle with dropper"
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
            </div>
            <p className="text-[15px] text-ink-muted">
              <span className="block font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
                Your top pick (example)
              </span>
              <span className="font-display font-semibold text-ink">Clarity Pop Niacinamide Serum.</span> Matched for Texture.
            </p>
          </div>

          <aside aria-label="Privacy" className="mt-10 border-l-[3px] border-ink pl-5 max-w-[62ch]">
            <p className="text-ink">
              {PRIVACY_LEAD}{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className={`underline underline-offset-[3px] rounded ${focusRing}`}>
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
            <ul className="mt-4 space-y-2 text-[15px] text-ink-muted">
              {scanPrivacyChecks.map((c) => (
                <li key={c} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <Link href="/privacy" className={`mt-4 inline-block font-medium text-ink underline underline-offset-[3px] rounded ${focusRing}`}>
              Read the privacy policy
            </Link>
          </aside>

          <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-light">
            <Link
              href="/face-analysis"
              data-track="scan_cta_click"
              data-track-location="markers_link"
              className={`inline-flex items-center gap-2 font-medium text-brand underline underline-offset-[3px] rounded ${focusRing}`}
            >
              <span>Start the free scan</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <span>{MEDICAL_NOTE}</span>
          </p>
        </div>
      </div>
    </Section>
  );
}
