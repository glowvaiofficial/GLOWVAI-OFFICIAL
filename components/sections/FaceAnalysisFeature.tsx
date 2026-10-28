"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { bestsellerProducts } from "@/config/content";
import { trustStripClaimsList } from "@/config/claims";
import { siteConfig } from "@/config/site";
import { formatPrice, getAssetPath } from "@/lib/utils";
import {
  ScanFace,
  Lock,
  ArrowRight,
  Droplets,
  Sparkles,
  Sun,
  Shield,
  Trash2,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

export function FaceAnalysisFeature() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const isFastDeliveryVerified = trustStripClaimsList.find((c) => c.id === "fastDelivery")?.verified ?? false;
  const sampleProds = bestsellerProducts.slice(0, 2);

  // IntersectionObserver for ScoreRing and ScoreBar animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.35 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // SVG Score Ring Constants (Overall Sample Score: 76)
  const sampleOverall = 76;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = isVisible
    ? circumference - (sampleOverall / 100) * circumference
    : circumference;

  return (
    <section
      id="face-scan"
      aria-labelledby="scan-title"
      ref={sectionRef}
      className="py-16 sm:py-24 bg-white relative overflow-hidden text-ink"
    >
      {/* Background Organic Sky Mist SVG Bleeding Off Right Edge */}
      <div className="absolute top-12 right-[-5%] w-[55%] h-[85%] bg-skymist/50 rounded-l-[140px] pointer-events-none -z-10 hidden lg:block" />

      <Container>
        {/* 2-Column Asymmetric Main Shell */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column (5 cols): Stepper & CTAs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-1.5 text-eyebrow text-brand font-semibold uppercase tracking-wider">
              <ScanFace className="w-4 h-4 text-brand shrink-0" />
              <span>Free face scan</span>
            </div>

            <h2 id="scan-title" className="font-display text-h2-section text-ink text-wrap-balance leading-tight max-w-[14ch]">
              No quiz. Just a <Accent>selfie</Accent> and 30 seconds.
            </h2>

            <p className="text-body-lg text-ink-muted leading-relaxed max-w-[50ch]">
              We look at hydration, texture, tone and clarity, then show you what your skin is actually asking for.
            </p>

            {/* Stepper (<ol>) with 2px Dotted Line */}
            <ol className="relative pl-6 space-y-6 border-l-2 border-dashed border-brand/30 my-6">
              <li className="relative group">
                <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-brand text-brand font-display font-bold text-xs flex items-center justify-center shadow-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-display font-bold text-lg text-ink">Scan</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Open your camera in good light. No filters, no makeup needed.
                  </p>
                </div>
              </li>

              <li className="relative group">
                <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-brand text-brand font-display font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-display font-bold text-lg text-ink">Score</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Get an instant breakdown across four skin markers.
                  </p>
                </div>
              </li>

              <li className="relative group">
                <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-brand text-brand font-display font-bold text-xs flex items-center justify-center shadow-xs">
                  3
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-display font-bold text-lg text-ink">Shop what fits</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    See products picked for your scores
                    {isFastDeliveryVerified && " at your door in about 15 minutes"}.
                  </p>
                </div>
              </li>
            </ol>

            {/* CTA Row & Privacy Line */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href="/face-analysis" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto h-[52px] gap-2  text-button-label">
                    <ScanFace className="w-5 h-5 text-ink shrink-0" />
                    <span>Start free scan</span>
                  </Button>
                </Link>

                <a
                  href="#what-we-check"
                  className="text-xs font-bold text-ink hover:text-brand transition-colors text-center py-3 px-4 underline"
                >
                  How the scan works
                </a>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-muted pt-1">
                <Lock className="w-4 h-4 text-brand shrink-0" />
                <span>We never store your photo. Only your score is saved, and only with your consent.</span>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Vertical Smartphone Face Scanner Composition */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end relative">
            
            {/* Butter Yellow Circle Peeking at Top-Right + 3 Coral Dots */}
            <div className="absolute -top-6 right-4 sm:right-12 w-32 h-32 rounded-full bg-yellow/80 blur-xl pointer-events-none z-0" />
            <div className="absolute top-4 right-16 flex gap-1.5 z-0">
              <span className="w-2.5 h-2.5 rounded-full bg-coral animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-coral opacity-80" />
              <span className="w-2.5 h-2.5 rounded-full bg-coral opacity-60" />
            </div>

            {/* Floating Scan Marker Badge Near Top-Left */}
            <div className="absolute -top-3 left-0 sm:left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-brand/20 text-xs font-bold text-brand flex items-center gap-2 z-30 animate-bounce-short">
              <Sparkles className="w-4 h-4 text-yellow-hover fill-yellow" />
              <span>4 skin markers checked</span>
            </div>

            {/* True Vertical Smartphone Frame (Width ~300px, Height ~580px, 9:18.5 aspect, 44px corner radius) */}
            <div className="relative w-[295px] sm:w-[320px] h-[570px] sm:h-[600px] rounded-[48px] bg-ink p-2.5 shadow-2xl border-[4px] border-ink transform -rotate-2 hover:rotate-0 transition-all duration-500 z-10 group">
              
              {/* Side Phone Buttons */}
              <div className="absolute -left-[5px] top-24 w-[5px] h-10 bg-ink/70 rounded-l-md" />
              <div className="absolute -left-[5px] top-38 w-[5px] h-10 bg-ink/70 rounded-l-md" />
              <div className="absolute -right-[5px] top-28 w-[5px] h-14 bg-ink/70 rounded-r-md" />

              {/* Screen Inner Container */}
              <div className="w-full h-full bg-ink rounded-[40px] overflow-hidden text-white relative flex flex-col justify-between p-3.5 border border-white/10">
                
                {/* Background Image: High Quality Face Selfie Scan */}
                <Image
                  src={getAssetPath("/images/hero/face-scan-selfie.webp")}
                  alt="Real-time face analysis selfie scan"
                  fill
                  priority
                  className="object-cover object-center z-0 opacity-90 scale-105 group-hover:scale-110 transition-transform duration-700"
                />

                {/* Dark Overlay Gradient for High Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-transparent to-ink/90 z-0 pointer-events-none" />

                {/* Top Dynamic Island Notch */}
                <div className="relative z-20 flex items-center justify-between w-full pt-1 px-1">
                  <div className="w-20 h-4 bg-black/90 backdrop-blur-md rounded-full mx-auto flex items-center justify-center gap-1.5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    <div className="w-2.5 h-1 bg-white/30 rounded-full" />
                  </div>
                </div>

                {/* Face Scanner HUD Grid & Laser Sweep Overlay */}
                <div className="absolute inset-x-3 top-14 bottom-14 border-2 border-dashed border-brand/60 rounded-3xl z-10 pointer-events-none flex flex-col justify-between p-2.5">
                  {/* Corner HUD Markers & Top Badge */}
                  <div className="flex justify-between items-start w-full">
                    <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-brand" />

                    {/* Live Status Badge (Positioned at Top of HUD - Away from Face) */}
                    <div className="bg-brand/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-white/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-mint animate-ping" />
                      <span>Live AI Scan</span>
                    </div>

                    <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-brand" />
                  </div>

                  {/* Bottom Corner HUD Markers */}
                  <div className="flex justify-between w-full">
                    <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-brand" />
                    <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-brand" />
                  </div>

                  {/* Scanning Laser Beam Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-light to-transparent shadow-glow animate-scan-laser" />
                </div>

                {/* Floating Marker Pins on Face (Positioned cleanly on sides) */}
                <div className="absolute top-20 left-4 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-brand/50 text-[9px] font-bold text-brand-light z-10 shadow-md">
                  • Hydration: 82%
                </div>
                <div className="absolute top-28 right-4 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-coral/50 text-[9px] font-bold text-coral-light z-10 shadow-md">
                  • Barrier: 64
                </div>

                {/* Bottom Action Button (Positioned at absolute bottom below chin & face) */}
                <div className="relative z-20 w-full pt-1 mt-auto">
                  <Link href="/face-analysis" className="block w-full">
                    <button className="w-full py-2 bg-gradient-to-r from-brand via-brand-light to-brand text-white font-bold text-[11px] rounded-xl shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-yellow" />
                      <span>Start free scan now</span>
                    </button>
                  </Link>
                </div>

                {/* Bottom Home Indicator Bar */}
                <div className="relative z-20 w-24 h-1 bg-white/40 rounded-full mx-auto mt-1.5" />

              </div>
            </div>

            {/* Overlapping Product Recommendation Floating Pill (Bottom Left) */}
            <div className="absolute bottom-4 left-0 sm:left-2 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-ink/10 max-w-[210px] transform rotate-3 hover:rotate-0 transition-transform z-20 hidden sm:flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-skymist relative overflow-hidden shrink-0 border border-ink/10">
                <Image src={sampleProds[0].image} alt={sampleProds[0].name} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink truncate">{sampleProds[0].name}</p>
                <p className="text-[9px] text-coral font-bold">Matched for Texture 64</p>
              </div>
            </div>

          </div>

        </div>

        {/* "What We Look At" Row (id="what-we-check", Full Container Width) */}
        <div id="what-we-check" className="pt-16 sm:pt-24 space-y-6">
          <div className="space-y-1">
            <span className="text-eyebrow text-brand font-semibold uppercase tracking-wider block">
              What the scan checks
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-ink">
              Four skin markers analyzed in 30 seconds
            </h3>
          </div>

          {/* Asymmetric Tiles (widths 3/3/3/3 desktop, mobile scroll-snap) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-scrollbar overflow-x-auto snap-x snap-mandatory flex-nowrap sm:flex-wrap">
            <div className="bg-skymist/70 p-5 rounded-3xl border border-brand/15 space-y-2 snap-center shrink-0 w-[78%] sm:w-auto">
              <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-brand border border-ink/10">
                <Droplets className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-lg text-ink">Hydration</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                How well your skin holds water.
              </p>
            </div>

            <div className="bg-blush/60 p-5 rounded-3xl border border-coral/15 space-y-2 snap-center shrink-0 w-[78%] sm:w-auto transform sm:translate-y-2">
              <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-coral border border-ink/10">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-lg text-ink">Texture</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Surface smoothness and pore visibility.
              </p>
            </div>

            <div className="bg-mint/60 p-5 rounded-3xl border border-ink/10 space-y-2 snap-center shrink-0 w-[78%] sm:w-auto">
              <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-ink border border-ink/10">
                <Sun className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-lg text-ink">Tone</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Evenness and sun-induced discoloration.
              </p>
            </div>

            <div className="bg-yellow/30 p-5 rounded-3xl border border-yellow-hover/30 space-y-2 snap-center shrink-0 w-[78%] sm:w-auto transform sm:translate-y-2">
              <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-ink border border-ink/10">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-lg text-ink">Clarity</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Active redness and calm barrier health.
              </p>
            </div>
          </div>
        </div>

        {/* Trust & Consent Mini Row */}
        <div className="pt-10 border-t border-ink/10 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Lock className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Photo stays on your phone</span>
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Saved only with your consent</span>
            </span>
            {siteConfig.supportEmail && (
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Trash2 className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>Delete your data anytime ({siteConfig.supportEmail})</span>
              </span>
            )}
          </div>

          <Link href="/privacy" className="text-brand font-bold underline hover:text-brand-dark">
            Read the privacy policy
          </Link>
        </div>

        {/* Required Medical Disclaimer Caption */}
        <p className="text-[11px] text-ink-muted/70 text-center pt-4">
          Cosmetic skin insights, not medical advice. Lighting and camera quality affect results.
        </p>

      </Container>
    </section>
  );
}

