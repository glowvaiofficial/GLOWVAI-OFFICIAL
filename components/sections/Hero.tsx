import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Accent } from "@/components/ui/Accent";
import { HeroVisual } from "./HeroVisual";
import { siteConfig } from "@/config/site";
import { Sparkles, ArrowRight, Zap, MapPin, ShieldCheck, Lock, Clock, Star, Users } from "lucide-react";

interface HeroProps {
  city?: string;
}

export function Hero({ city = "Vijayawada" }: HeroProps) {
  const hasVerifiedRating = Boolean(siteConfig.rating && siteConfig.rating.trim());
  const hasVerifiedCustomerCount = Boolean(siteConfig.customerCount && siteConfig.customerCount.trim());

  return (
    <section className="relative bg-white pt-6 sm:pt-10 pb-8 sm:pb-12 overflow-hidden flex flex-col justify-center">
      {/* Background Subtle Soft Blurs */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-skymist/50 rounded-blob blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-blush/30 rounded-blob blur-3xl pointer-events-none -z-10" />

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column - Typography & CTAs (7 cols) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-left max-w-2xl">
            
            {/* Eyebrow: Express pill + location badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="text-eyebrow bg-brand text-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold">
                <Zap className="w-3 h-3 text-yellow fill-yellow shrink-0" />
                <span>15-minute doorstep express</span>
              </span>
              <span className="text-ink-muted font-medium flex items-center gap-1 text-xs sm:text-sm">
                <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>Delivering to {city}</span>
              </span>
            </div>

            {/* Main H1 Headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.1] tracking-tight">
              Your bestie says you’re <Accent underline>glowing</Accent>. Let’s see if your skin agrees. 👀
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-ink-muted font-normal leading-relaxed max-w-xl">
              Scan your face in 30 seconds for an instant skin check & personalized routine. Delivered to your doorstep in 15 minutes.
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link href="/face-analysis" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto h-[52px] flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold shadow-md rounded-2xl text-xs sm:text-sm px-6"
                >
                  <Sparkles className="w-5 h-5 text-yellow shrink-0" />
                  <span>Scan my face, it&apos;s free</span>
                </Button>
              </Link>

              <Link href="/shop" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-[52px] flex items-center justify-center gap-2 text-ink font-bold border-2 border-ink/10 hover:bg-ink-subtle rounded-2xl text-xs sm:text-sm px-6"
                >
                  <span>Shop routine products</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              </Link>
            </div>

            {/* Proof Row */}
            <div className="pt-4 border-t border-ink/10 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-ink-muted font-medium">
              {hasVerifiedRating && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow fill-yellow shrink-0" />
                  <span className="font-bold text-ink">{siteConfig.rating}</span>
                </div>
              )}

              {hasVerifiedCustomerCount && (
                <div className="flex items-center gap-1.5 text-ink-muted">
                  <Users className="w-4 h-4 text-brand shrink-0" />
                  <span className="font-semibold text-ink">{siteConfig.customerCount}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                <span className="font-semibold text-ink">Free AI Face Scan</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand shrink-0" />
                <span className="font-semibold text-ink">Private On-Device Scan</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-coral shrink-0" />
                <span className="font-semibold text-ink">15-min delivery in Vijayawada</span>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Visual */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <HeroVisual city={city} />
          </div>

        </div>
      </Container>
    </section>
  );
}
