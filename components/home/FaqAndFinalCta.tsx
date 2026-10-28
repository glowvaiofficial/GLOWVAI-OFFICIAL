import React from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Section, SectionTitle, focusRing } from "./shared";
import { faqItems } from "@/config/content";

export function FaqHome() {
  return (
    <Section id="faq" tone="deep" labelledBy="faq-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
        <div className="lg:col-span-4">
          <SectionTitle id="faq-title">Everything you need to know.</SectionTitle>
          <p className="mt-5 text-ink-muted max-w-[34ch]">Clear answers about the scan, privacy and delivery.</p>
          <div className="mt-8 border-t border-ink/20 pt-5 text-[15px] text-ink-muted space-y-2">
            <p className="font-display font-semibold text-lg text-ink">Still curious?</p>
            <p>
              <a
                href="https://wa.me/918977855998"
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp_click"
                data-track-location="faq"
                className={`font-medium text-ink underline underline-offset-[3px] rounded ${focusRing}`}
              >
                Chat on WhatsApp
              </a>
            </p>
            <p>
              <a href="mailto:contact@glowvai.in" className={`font-medium text-ink underline underline-offset-[3px] rounded ${focusRing}`}>
                Email contact@glowvai.in
              </a>
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          {faqItems.map((item, i) => (
            <details key={item.question} open={i === 0} data-faq-id={`q${i + 1}`} className="group border-b border-ink/20 first:border-t">
              <summary
                className={`flex items-center justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded ${focusRing}`}
              >
                <h3 className="font-display font-semibold text-lg text-ink">{item.question}</h3>
                <Plus
                  className="w-6 h-6 shrink-0 text-ink group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 text-ink-muted max-w-[62ch]">
                {item.answer}
                {item.question === "What is your returns policy?" && (
                  <>
                    {" "}
                    <Link href="/returns" className="font-medium text-brand underline underline-offset-[3px]">
                      Returns and refunds
                    </Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Layout: one strong sentence and one button, on the only dark band.
export function FinalCta() {
  return (
    <Section id="start" tone="ink" labelledBy="final-title" pad="open" bleed>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 text-center">
        <h2
          id="final-title"
          className="font-display font-semibold text-[clamp(2.5rem,1.5rem+4.5vw,5.5rem)] leading-[1] tracking-[-0.03em] max-w-[18ch] mx-auto"
        >
          Ready to know your skin?
        </h2>
        <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-white/85 max-w-[44ch] mx-auto">
          Take a 30-second scan. Get your report, then your routine.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-5">
          <Link
            href="/face-analysis"
            data-track="scan_cta_click"
            data-track-location="final_cta"
            className="inline-flex items-center justify-center gap-2.5 min-h-[60px] px-9 text-lg font-semibold rounded-[10px] bg-white text-ink hover:bg-paper-deep transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-white"
          >
            <span>Start free scan</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
          <a
            href="https://wa.me/918977855998"
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-track-location="final_cta"
            className="font-medium text-white underline underline-offset-[5px] decoration-white/40 hover:decoration-white rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-white"
          >
            or chat on WhatsApp
          </a>
        </div>
        <p className="mt-6 font-mono text-[13px] text-white/70">
          Free &middot; Photos stored privately &middot;{" "}
          <a href="tel:+918977855998" className="text-white underline underline-offset-[3px] rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white">
            +91 89778 55998
          </a>
        </p>
      </div>
    </Section>
  );
}
