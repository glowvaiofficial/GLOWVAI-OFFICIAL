import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Accent } from "@/components/ui/Accent";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { storyData } from "@/config/story";
import { assetConfig } from "@/config/assets";
import { ArrowRight } from "lucide-react";

export function WhyWeStarted() {
  // Take the first 4 milestones for the home page teaser
  const activeTimelineRows = storyData.timeline.slice(0, 4);
  const showTimelineCard = activeTimelineRows.length >= 2;

  return (
    <section className="py-16 sm:py-28 bg-white border-t border-ink/10 relative overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column (5 cols desktop): Narrative & Pull-Quote */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-eyebrow text-brand font-semibold tracking-wider uppercase block">
              Why we started
            </span>

            <h2 className="font-display font-semibold text-h2-section text-ink text-wrap-balance leading-[1.08]">
              We figured there had to be an easier place to start. What if the best tool was in your <Accent>pocket?</Accent>
            </h2>

            <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-normal">
              {storyData.problem}
            </p>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-normal">
              {storyData.origin}
            </p>

            {/* Thin Coral Rule (2px high, 48px wide) above Pull-Quote */}
            <div className="pt-2 space-y-3">
              <div className="w-12 h-[2px] bg-coral rounded-full" />
              <blockquote className="font-display text-xl sm:text-2xl font-semibold text-ink leading-snug">
                &ldquo;What if the best tool for understanding your skin was already in your pocket?&rdquo;
              </blockquote>
            </div>

            <div className="pt-2">
              <Link href="/our-story">
                <Button variant="primary" size="md" className="gap-2 shadow-coral-glow text-button-label">
                  <span>Read our full story</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column (7 cols desktop): Clean 3-Founder Showcase Grid & Timeline */}
          <div className="lg:col-span-7 relative flex flex-col justify-center items-center lg:items-end space-y-4">

            {/* 3-Founder Card Showcase Container */}
            <div className="relative w-full max-w-[560px] bg-skymist/50 backdrop-blur-md p-3.5 sm:p-5 rounded-[36px] border border-brand/15 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-brand/10 pb-2 px-1">
                <span className="text-[11px] font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span>Founding Team • Vijayawada & Visakhapatnam</span>
                </span>
                <span className="text-[10px] text-ink-muted font-medium">3 Founders</span>
              </div>

              {/* 3 Founder Cards Side-by-Side (0 Overlaps - All 3 Faces Fully Clear) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">

                {/* Founder 1: Sardar Musthafa */}
                <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-md border-2 sm:border-4 border-white bg-white group hover:scale-[1.03] transition-transform">
                  <PlaceholderImage
                    src={assetConfig.story.teamAtDesk.src}
                    alt="Sardar Musthafa - Founder & CEO"
                    caption={assetConfig.story.teamAtDesk.caption}
                    objectPosition="object-center"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent p-2 text-white">
                    <p className="text-[10px] sm:text-xs font-bold leading-tight">Sardar</p>
                    <p className="text-[8px] sm:text-[9px] text-yellow font-semibold truncate">Founder, Vision</p>
                  </div>
                </div>

                {/* Founder 2: Nalla Satvik */}
                <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-md border-2 sm:border-4 border-white bg-white group hover:scale-[1.03] transition-transform">
                  <PlaceholderImage
                    src={assetConfig.story.workingMoment.src}
                    alt="Nalla Satvik - Co-Founder & Technical Lead"
                    caption={assetConfig.story.workingMoment.caption}
                    objectPosition="object-center"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent p-2 text-white">
                    <p className="text-[10px] sm:text-xs font-bold leading-tight">Nalla Satvik</p>
                    <p className="text-[8px] sm:text-[9px] text-skymist font-semibold truncate">Co-Founder & Technical Lead</p>
                  </div>
                </div>

                {/* Founder 3: Rehmit (object-top so face is fully visible) */}
                <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-md border-2 sm:border-4 border-white bg-white group hover:scale-[1.03] transition-transform">
                  <PlaceholderImage
                    src={assetConfig.story.productCloseUp.src}
                    alt="Rehmit - Market Explorer"
                    caption={assetConfig.story.productCloseUp.caption}
                    objectPosition="object-top"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent p-2 text-white">
                    <p className="text-[10px] sm:text-xs font-bold leading-tight">Rehmit</p>
                    <p className="text-[8px] sm:text-[9px] text-coral-light font-semibold truncate">Market Explorer</p>
                  </div>
                </div>

              </div>

              {/* Timeline Card Row inside container */}
              {showTimelineCard && (
                <div className="pt-2 border-t border-brand/10">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {activeTimelineRows.map((row, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-xl border border-ink/5">
                        <div className="flex items-center gap-1 font-bold text-ink">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                          <span className="truncate">{row.period}</span>
                        </div>
                        <p className="text-[9px] text-ink-muted pl-2.5 truncate">{row.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}



