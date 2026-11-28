import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section, SectionTitle, focusRing } from "./shared";
import { filterProducts } from "@/lib/catalog";
import { concernCards } from "@/config/home-content";
import { concernPages } from "@/config/concerns";
import { getAssetPath } from "@/lib/utils";

const concernImages: Record<string, { src: string; alt: string }> = {
  acne: { src: "/images/face-scan/skin_grid.png", alt: "Breakouts and pores skin texture scan" },
  dullness: { src: "/images/face-analysis/glow_results.png", alt: "Dullness and glow skin analysis" },
  dryness: { src: "/images/face-analysis/barrier_depth.png", alt: "Dehydration barrier hydration scan" },
  pigmentation: { src: "/images/face-scan/indian_female.png", alt: "Dark spots and pigmentation analysis" },
  "sun-care": { src: "/images/products/sunscreen-1.png", alt: "Sun protection sunscreen fluid" },
  "hair-body": { src: "/images/products/body-1.png", alt: "Scalp and body care formula" },
};

// Layout: a big-type index with visual concern previews. Counts come from the real catalogue.
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
            className={`mt-6 inline-flex min-h-11 items-center gap-2 font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
          >
            <span>Not sure? Take the 30-second scan</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
          {concernCards.map((c) => {
            const count = filterProducts({ concern: c.slug }).length;
            const img = concernImages[c.slug];
            return (
              <li key={c.slug} className="relative group rounded-[26px] bg-white/85 ring-1 ring-ink/[0.06] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover p-3.5 sm:p-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] bg-paper-deep">
                  <Image
                        src={getAssetPath(img?.src || "/images/face-scan/skin_grid.png")}
                        alt={img?.alt || c.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 360px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                </div>
                <div className="px-1.5 pt-4 pb-1.5">
                  <h3 className="font-display font-semibold text-[clamp(1.375rem,1.1rem+0.9vw,1.75rem)] leading-[1.1] tracking-[-0.02em] text-ink group-hover:text-brand transition-colors">
                    <Link
                          href={concernPages.find((p) => p.key === c.slug) ? `/concerns/${concernPages.find((p) => p.key === c.slug)!.slug}` : `/shop?concern=${c.slug}`}
                          data-track="concern_card_click"
                          data-track-concern_slug={c.slug}
                          className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-brand"
                        >
                          {c.title}
                        </Link>
                  </h3>
                  <p className="mt-1.5 text-ink-muted text-[15px] leading-relaxed">{c.line}</p>
                  <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
                    <span>{count > 0 ? `${count} ${count === 1 ? "formula" : "formulas"}` : ""}</span>
                    <ArrowRight className="w-5 h-5 text-ink group-hover:translate-x-1 transition-transform" aria-hidden="true" />
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
