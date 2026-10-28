import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, Sparkles, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const concernTiles = [
  {
    slug: "acne",
    label: "Breakouts & Pores",
    hook: "Breakouts that won't take a hint",
    tint: "bg-blush/80 border-coral/20 hover:border-coral/40",
    cols: "lg:col-span-5 lg:row-span-2",
    count: "4 Formulas",
    icon: (
      <svg className="w-8 h-8 text-coral fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ),
  },
  {
    slug: "dullness",
    label: "Dullness & Glow",
    hook: "Skin that looks tired by 3 pm",
    tint: "bg-yellow/40 border-yellow-500/30 hover:border-yellow-500/60",
    cols: "lg:col-span-4",
    count: "3 Formulas",
    icon: (
      <svg className="w-8 h-8 text-yellow-hover fill-current" viewBox="0 0 24 24">
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
      </svg>
    ),
  },
  {
    slug: "dryness",
    label: "Dehydration",
    hook: "Tight, flaky, thirsty skin",
    tint: "bg-skymist/80 border-brand/15 hover:border-brand/40",
    cols: "lg:col-span-3",
    count: "5 Formulas",
    icon: (
      <svg className="w-8 h-8 text-brand fill-current" viewBox="0 0 24 24">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
  },
  {
    slug: "pigmentation",
    label: "Dark Spots",
    hook: "Marks that overstayed their welcome",
    tint: "bg-mint/80 border-mint hover:border-brand/40",
    cols: "lg:col-span-4",
    count: "3 Formulas",
    icon: (
      <svg className="w-8 h-8 text-ink fill-current" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z"/>
      </svg>
    ),
  },
  {
    slug: "sun-care",
    label: "Sun Protection",
    hook: "Sunscreen you will actually wear",
    tint: "bg-skymist/80 border-brand/15 hover:border-brand/40",
    cols: "lg:col-span-3",
    count: "2 Formulas",
    icon: (
      <svg className="w-8 h-8 text-brand fill-current" viewBox="0 0 24 24">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/>
      </svg>
    ),
  },
  {
    slug: "hair-body",
    label: "Scalp & Body",
    hook: "Elbows, knees, everything below chin",
    tint: "bg-blush/80 border-coral/20 hover:border-coral/40",
    cols: "lg:col-span-4",
    count: "3 Formulas",
    icon: (
      <svg className="w-8 h-8 text-coral fill-current" viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21c-.19.56.23 1 1 1h13.3c.77 0 1.19-.44 1-1l-.62-3.39A8.96 8.96 0 0 0 21 12c0-4.97-4.03-9-9-9z"/>
      </svg>
    ),
  },
];

export function ShopByConcern() {
  return (
    <section className="py-16 sm:py-24 bg-white border-t border-ink/10">
      <Container>
        {/* Header */}
        <div className="space-y-2 mb-10 max-w-2xl">
          <Badge variant="brand" size="md">
            Start With The Problem
          </Badge>
          <h2 className="font-display text-h2-section text-ink text-wrap-balance">
            Pick what your skin is <Accent>fussing</Accent> about.
          </h2>
          <p className="text-body-lg text-ink-muted">
            Tell us what is bugging your skin right now. We will show you what helps in 15 minutes.
          </p>
        </div>

        {/* 12-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {concernTiles.map((tile) => (
            <Link
              key={tile.slug}
              href={`/shop?concern=${tile.slug}`}
              className={cn(
                "group relative rounded-[28px] p-6 sm:p-7 border flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-card hover:-translate-y-1 min-h-[220px]",
                tile.tint,
                tile.cols
              )}
            >
              <div className="flex items-start justify-between gap-4 z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/90 flex items-center justify-center shadow-xs">
                  {tile.icon}
                </div>
                <div className="w-9 h-9 rounded-full bg-white text-ink group-hover:bg-brand group-hover:text-white flex items-center justify-center shadow-xs transition-colors shrink-0">
                  <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                </div>
              </div>

              <div className="space-y-1.5 pt-6 z-10">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-xl text-ink group-hover:text-brand transition-colors">
                    {tile.label}
                  </span>
                  <span className="text-[11px] font-bold text-ink-muted bg-white/80 px-2.5 py-0.5 rounded-full">
                    {tile.count}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed font-medium">
                  {tile.hook}
                </p>
              </div>
            </Link>
          ))}

          {/* Banner Tile: Not Sure? Scan your face */}
          <div className="lg:col-span-5 bg-brand text-white rounded-[28px] p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="space-y-2 z-10">
              <Badge variant="coral" size="sm">
                <Sparkles className="w-3.5 h-3.5 text-ink fill-ink" />
                <span>30-Sec Smart Scan</span>
              </Badge>
              <h3 className="font-display font-bold text-2xl text-white">
                Not sure? Let our camera check for you.
              </h3>
              <p className="text-xs text-skymist leading-relaxed">
                No guessing. Instant 4-marker analysis right inside your browser.
              </p>
            </div>

            <div className="pt-6 z-10">
              <Link href="/face-analysis">
                <Button variant="primary" size="md" className="gap-2 shadow-coral-glow text-button-label">
                  <Camera className="w-4.5 h-4.5 text-ink" />
                  <span>Start free face scan</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
