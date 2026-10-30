import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionTitle, focusRing } from "./shared";
import { filterProducts } from "@/lib/catalog";
import { concernCards } from "@/config/home-content";
import { concernPages } from "@/config/concerns";

// Layout: a big-type index (no cards, no icons). Counts come from the real catalogue.
export function ShopByConcernSection() {
  return (
    <Section id="concerns" tone="deep" labelledBy="concern-title" pad="open">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
        <div className="lg:col-span-4">
          <SectionTitle id="concern-title">What is your skin fussing about?</SectionTitle>
          <p className="mt-5 text-ink-muted max-w-[34ch]">Pick a concern and we&rsquo;ll show what helps.</p>
          <Link
            href="/face-analysis"
            data-track="scan_cta_click"
            data-track-location="concerns_link"
            className={`mt-6 inline-flex items-center gap-2 font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
          >
            <span>Not sure? Take the 30-second scan</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="lg:col-span-8 border-t border-ink/20">
          {concernCards.map((c) => {
            const count = filterProducts({ concern: c.slug }).length;
            return (
              <li key={c.slug} className="relative border-b border-ink/20 group">
                <div className="flex items-baseline justify-between gap-6 py-5 sm:py-6">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.05] tracking-[-0.02em] text-ink group-hover:text-brand transition-colors">
                      <Link
                        href={concernPages.find((p) => p.key === c.slug) ? `/concerns/${concernPages.find((p) => p.key === c.slug)!.slug}` : `/shop?concern=${c.slug}`}
                        data-track="concern_card_click"
                        data-track-concern_slug={c.slug}
                        className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-brand"
                      >
                        {c.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-ink-muted">{c.line}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
                    {count > 0 && (
                      <span>
                        {count} {count === 1 ? "formula" : "formulas"}
                      </span>
                    )}
                    <ArrowRight className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
