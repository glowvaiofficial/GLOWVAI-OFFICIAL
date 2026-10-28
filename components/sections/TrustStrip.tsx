"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { trustStripClaimsList } from "@/config/claims";
import {
  ScanFace,
  Lock,
  MapPin,
  ShieldCheck,
  Heart,
  Zap,
  CreditCard,
  Pause,
  Play,
} from "lucide-react";

export function TrustStrip() {
  const [isPaused, setIsPaused] = useState(false);

  // Filter only verified claims
  const verifiedClaims = trustStripClaimsList.filter((c) => c.verified);

  if (verifiedClaims.length === 0) {
    return null; // Render nothing if zero verified items
  }

  const iconMap: Record<string, React.ReactNode> = {
    freeScan: <ScanFace className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    imageStoredPrivately: <Lock className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    photoNeverStored: <Lock className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    madeInIndia: <MapPin className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    dermatologistTested: <ShieldCheck className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    crueltyFree: <Heart className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    fastDelivery: <Zap className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
    securePayments: <CreditCard className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />,
  };

  const isStatic = verifiedClaims.length < 3;

  return (
    <section
      aria-label="Why people trust us"
      className="w-full bg-skymist h-[64px] sm:h-[72px] border-y border-ink/10 relative overflow-hidden flex items-center group select-none"
    >
      {/* Left and Right Edge Fade Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-skymist to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-skymist to-transparent z-10 pointer-events-none" />

      <Container className="h-full flex items-center justify-between overflow-hidden">
        {isStatic ? (
          /* Static Centered Row when <3 items pass filter */
          <ul className="w-full flex items-center justify-center gap-6 sm:gap-10 text-sm font-medium text-ink/85 font-sans">
            {verifiedClaims.map((item) => (
              <li key={item.id} className="flex items-center gap-2 shrink-0">
                {iconMap[item.id] || <ShieldCheck className="w-5 h-5 text-brand shrink-0" />}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          /* Marquee Track */
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            className="relative w-full overflow-hidden flex items-center"
          >
            <div
              className={`flex items-center gap-6 sm:gap-10 whitespace-nowrap animate-marquee ${
                isPaused ? "animate-marquee-paused" : ""
              } motion-reduce:animate-none`}
            >
              {/* Primary Track */}
              <ul className="flex items-center gap-6 sm:gap-10 shrink-0">
                {verifiedClaims.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <li className="flex items-center gap-2">
                      {iconMap[item.id] || <ShieldCheck className="w-5 h-5 text-brand shrink-0" />}
                      <span className="text-sm font-medium text-ink/85 font-sans">{item.label}</span>
                    </li>
                    {idx < verifiedClaims.length - 1 && (
                      <span className="w-1 h-1 rounded-full bg-brand shrink-0 hidden sm:inline-block" />
                    )}
                  </React.Fragment>
                ))}
              </ul>

              {/* Duplicated Track for Continuous Loop (aria-hidden) */}
              <ul aria-hidden="true" className="flex items-center gap-6 sm:gap-10 shrink-0">
                <span className="w-1 h-1 rounded-full bg-brand shrink-0 hidden sm:inline-block" />
                {verifiedClaims.map((item, idx) => (
                  <React.Fragment key={`dup-${item.id}`}>
                    <li className="flex items-center gap-2">
                      {iconMap[item.id] || <ShieldCheck className="w-5 h-5 text-brand shrink-0" />}
                      <span className="text-sm font-medium text-ink/85 font-sans">{item.label}</span>
                    </li>
                    {idx < verifiedClaims.length - 1 && (
                      <span className="w-1 h-1 rounded-full bg-brand shrink-0 hidden sm:inline-block" />
                    )}
                  </React.Fragment>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* WCAG 2.2.2 Keyboard-reachable Pause/Play Toggle Button */}
        {!isStatic && (
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? "Play scrolling trust badges" : "Pause scrolling trust badges"}
            className="relative z-20 ml-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-ink border border-ink/10 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}
      </Container>
    </section>
  );
}

