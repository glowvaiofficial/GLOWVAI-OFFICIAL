import React from "react";
import { Container } from "@/components/ui/Container";
import { Accent } from "@/components/ui/Accent";
import { brandValuesClaims, neverListVerified, neverList } from "@/config/claims";
import { ShieldCheck, Lock, Sparkles, Sun, X } from "lucide-react";

export function BrandValues() {
  const panelsData = [
    {
      num: "01",
      title: brandValuesClaims.honestClaims.title,
      desc: brandValuesClaims.honestClaims.text,
      bg: "bg-skymist/60 border-brand/20",
      icon: ShieldCheck,
      verified: brandValuesClaims.honestClaims.verified,
    },
    {
      num: "02",
      title: brandValuesClaims.privacyFirst.title,
      desc: brandValuesClaims.privacyFirst.text,
      bg: "bg-blush/60 border-coral/20",
      icon: Lock,
      verified: brandValuesClaims.privacyFirst.verified,
    },
    {
      num: "03",
      title: brandValuesClaims.pricedForRealLife.title,
      desc: brandValuesClaims.pricedForRealLife.text,
      bg: "bg-mint/60 border-ink/10",
      icon: Sparkles,
      verified: brandValuesClaims.pricedForRealLife.verified,
    },
    {
      num: "04",
      title: brandValuesClaims.madeForIndianSkin.title,
      desc: brandValuesClaims.madeForIndianSkin.text,
      bg: "bg-yellow/50 border-yellow-hover/30",
      icon: Sun,
      verified: brandValuesClaims.madeForIndianSkin.verified,
    },
  ];

  // Render ONLY panels whose verified flag is true
  const activePanels = panelsData.filter((p) => p.verified === true);

  // Render never list ONLY if list is non-empty AND neverListVerified is true
  const showNeverList = neverListVerified && neverList.length > 0;

  return (
    <section className="py-16 sm:py-28 bg-white border-t border-ink/10">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column (5 cols desktop): Sticky Header Block */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[120px] lg:self-start">
            <span className="text-eyebrow text-brand font-semibold tracking-wider uppercase block">
              What we stand for
            </span>

            <h2 className="font-display font-semibold text-h2-section text-ink text-wrap-balance leading-[1.08]">
              Skincare that speaks the plain <Accent>truth.</Accent>
            </h2>

            <p className="text-body-lg text-ink-muted leading-relaxed font-normal">
              No mystery chemicals, no exaggerated marketing claims. Built from Andhra Pradesh with honest engineering.
            </p>
          </div>

          {/* Right Column (7 cols desktop): Stacked Value Panels */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4 relative">
              {activePanels.map((panel, idx) => {
                const Icon = panel.icon;
                const topOffset = 120 + idx * 16;

                return (
                  <div
                    key={panel.num}
                    style={{ top: `${topOffset}px` }}
                    className={`lg:sticky rounded-[28px] p-6 sm:p-8 border shadow-xs transition-all ${panel.bg} space-y-4`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-3xl sm:text-4xl text-ink/20">
                        {panel.num}
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-ink">
                        <Icon className="w-5 h-5 text-brand" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-ink">
                        {panel.title}
                      </h3>
                      <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-normal">
                        &ldquo;{panel.desc}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* "Never in our products" Strip (Ships empty, renders ONLY when verified and non-empty) */}
            {showNeverList && (
              <div className="pt-6 border-t border-ink/10 space-y-3">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
                  Never in our products:
                </span>
                <div className="flex flex-wrap gap-2">
                  {neverList.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-blush text-ink text-xs font-semibold px-3 py-1.5 rounded-full border border-coral/20 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5 text-coral shrink-0" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </Container>
    </section>
  );
}
