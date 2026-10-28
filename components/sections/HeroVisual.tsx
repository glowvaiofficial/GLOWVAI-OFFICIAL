"use client";

import React, { useState } from "react";
import Image from "next/image";
import { assetConfig } from "@/config/assets";
import { getAssetPath } from "@/lib/utils";
import { heroContent } from "@/config/content";
import { proofClaims } from "@/config/claims";
import { Sparkles, Leaf } from "lucide-react";

interface HeroVisualProps {
  city?: string;
}

export function HeroVisual({ city = "Hyderabad" }: HeroVisualProps) {
  const [imageError, setImageError] = useState(false);

  // Check if dermatologist tested & cruelty free claims are verified in claims.ts
  const isDermVerified = proofClaims.find((c) => c.id === "p_derm")?.verified ?? false;
  const badgeText = isDermVerified
    ? "DERMATOLOGIST TESTED ★ CRUELTY FREE ★ "
    : "MADE IN INDIA ★ FREE SKIN SCAN ★ ";

  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[460px] lg:max-w-[480px] max-h-[580px] aspect-[4/5] mx-auto select-none overflow-visible"
    >
      {/* Layer 1: Hand-drawn Organic Electric Blue SVG Blob Backdrop (visible on bottom & right, rotated -4deg) */}
      <div className="absolute inset-0 flex items-center justify-center transform -rotate-4 transition-transform duration-700 hover:rotate-0">
        <svg
          viewBox="0 0 400 480"
          className="w-[95%] h-[95%] drop-shadow-xl overflow-visible text-brand"
          fill="currentColor"
        >
          <path d="M 60,80 C 120,20 280,30 340,90 C 400,150 390,320 330,400 C 270,470 110,460 50,380 C -10,300 0,140 60,80 Z" />
          <path
            d="M 80,100 C 130,50 260,60 310,110 C 330,130 335,170 320,210 C 290,140 180,100 80,100 Z"
            fill="#E6EEFF"
            fillOpacity="0.22"
          />
        </svg>
      </div>

      {/* Layer 2: Generated Skincare Photography Frame (Rotated 2deg on top of blob) */}
      <div className="absolute inset-x-6 top-0 bottom-8 z-10 flex flex-col items-center justify-center transform rotate-2 transition-transform duration-500 hover:rotate-0">
        {/* Soft Contact Shadow under frame */}
        <div className="absolute bottom-[-10px] w-56 h-6 rounded-[100%] bg-ink/15 blur-md pointer-events-none" />

        {!imageError ? (
          <div className="relative w-full h-full max-h-[460px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
            <Image
              src={getAssetPath(assetConfig.hero.product)}
              alt="GLOW VAI Cosmetics skincare serums and ointments collection"
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 768px) 100vw, 480px"
              onError={() => setImageError(true)}
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        ) : (
          /* Art-Direction Fallback Box */
          <div className="relative w-[90%] h-[85%] bg-white/95 backdrop-blur-md rounded-3xl border-2 border-dashed border-brand/40 shadow-xl p-5 flex flex-col items-center justify-between text-center overflow-hidden">
            <div className="w-16 h-28 my-auto relative flex items-center justify-center">
              <svg className="w-full h-full text-brand/30 fill-current" viewBox="0 0 100 200">
                <rect x="35" y="10" width="30" height="35" rx="5" />
                <rect x="42" y="45" width="16" height="15" />
                <path d="M 20 60 L 80 60 Q 90 60 90 75 L 90 180 Q 90 195 75 195 L 25 195 Q 10 195 10 180 L 10 75 Q 10 60 20 60 Z" />
              </svg>
              <span className="absolute font-display text-xs font-bold text-brand uppercase tracking-wider">
                GLOW VAI
              </span>
            </div>
            <div className="bg-skymist/80 rounded-xl p-2.5 border border-brand/15 text-[10px] text-ink-muted text-left font-mono">
              {assetConfig.hero.artDirectionCaption}
            </div>
          </div>
        )}
      </div>

      {/* Layer 3: Texture Swatch / Butter Yellow Circle with Leaf SVG (Bottom-Right, NO stock faces) */}
      <div className="absolute bottom-4 right-2 w-24 h-24 rounded-full border-4 border-white shadow-card z-20 bg-yellow flex items-center justify-center transform hover:scale-105 transition-transform">
        <Leaf className="w-8 h-8 text-ink/80" />
      </div>

      {/* Layer 4: Floating UI Cards */}

      {/* Card A: Top-Left "Sample skin score" card (max 200px wide, label "SAMPLE REPORT") */}
      <div className="absolute top-2 left-0 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-card border border-ink/10 animate-float space-y-1.5 z-30 max-w-[190px] w-full">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">SAMPLE REPORT</span>
          <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-brand">84</span>
          <span className="text-[9px] font-bold text-ink bg-mint px-2 py-0.5 rounded-full">
            Barrier strong
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-ink-muted">
            <span>Hydration depth</span>
            <span className="font-bold text-ink">92%</span>
          </div>
          <div className="w-full bg-skymist h-1 rounded-full overflow-hidden">
            <div className="bg-brand h-full rounded-full" style={{ width: "92%" }} />
          </div>
        </div>
      </div>

      {/* Card B: Mid-Right Ingredient Chip (Butter Yellow, Ink text) */}
      <div className="absolute top-[40%] right-[0px] bg-yellow text-ink px-3 py-1.5 rounded-xl shadow-md border border-yellow-hover/20 font-semibold text-xs flex items-center gap-1.5 z-30 animate-float-delayed">
        <Sparkles className="w-3.5 h-3.5 text-ink fill-ink shrink-0" />
        <span>2% Niacinamide + Cica</span>
      </div>

      {/* Card C: Bottom-Left White Delivery Chip ("Arriving in 14 min" with pulsing dot, fully inside wrapper) */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-card border border-ink/10 flex items-center gap-2 z-30">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-coral"></span>
        </span>
        <span className="text-xs font-bold text-ink">Arriving in 14 min</span>
      </div>

      {/* Layer 5: Rotating Circular Text Badge (Top-Right SVG textPath on 120px circle, 20s rotation, paused for reduced motion, hidden on mobile) */}
      <div className="absolute -top-3 right-0 w-[120px] h-[120px] pointer-events-none z-30 hidden md:block">
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-full h-full animate-spin-slow motion-reduce:animate-none text-brand" viewBox="0 0 120 120">
            <path
              id="heroBadgePath"
              d="M 60,60 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
              fill="none"
            />
            <text className="text-[9px] font-bold fill-brand uppercase" style={{ letterSpacing: "0.18em" }}>
              <textPath href="#heroBadgePath" startOffset="0%">
                {badgeText}
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Sparkles className="w-4 h-4 text-coral fill-coral" />
          </div>
        </div>
      </div>
    </div>
  );
}

