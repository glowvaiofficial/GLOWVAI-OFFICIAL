"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, MapPin, ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

interface AnnouncementBarProps {
  city?: string;
}

const provableMessages = [
  "Free skin scan • Instant cosmetic insights",
  "Photos stored privately with consent",
  "Authorized products • Minimalist & The Derma Co",
];

export function AnnouncementBar({ city = "Vijayawada" }: AnnouncementBarProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % provableMessages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-brand text-white text-xs font-semibold py-2 px-4 relative z-50 overflow-hidden border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Location & Phone Contact */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white">
            <MapPin className="w-3 h-3 text-coral fill-coral" />
            <span>Delivering to {city}</span>
          </div>
          <a
            href="tel:+918977855998"
            className="flex items-center gap-1 text-[11px] text-white/90 hover:text-yellow transition-colors font-medium"
          >
            <Phone className="w-3 h-3 text-mint" />
            <span>+91 89778 55998</span>
          </a>
        </div>

        {/* Center: Rotating Short Message */}
        <div className="flex-1 text-center truncate flex items-center justify-center gap-1.5 text-[11px] sm:text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-yellow shrink-0 inline" />
          <span className="transition-all duration-300 inline-block font-semibold truncate">
            {provableMessages[index]}
          </span>
        </div>

        {/* Right: Quick Free Scan CTA */}
        <div className="hidden md:flex items-center gap-1 text-[11px] font-bold underline hover:text-yellow transition-colors shrink-0">
          <Link href="/face-analysis" className="flex items-center gap-1">
            <span>Free Scan</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
