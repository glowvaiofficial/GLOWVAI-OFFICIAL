"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Gift, Store, Truck, Sparkles, ArrowRight, Share2, ShieldCheck, Camera, CheckCircle2 } from "lucide-react";

export function ReferralAndVendorSection() {
  return (
    <section className="py-16 sm:py-24 bg-ink-subtle border-y border-ink/10 text-ink">
      <Container>
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3.5 py-1 rounded-full text-xs font-bold border border-brand/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GLOW VAI Ecosystem</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
            AI Scan. Local Vendors. <span className="text-brand">15-Min Delivery.</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            From a quick 30-second camera check to neighborhood pharmacy hubs in Vijayawada and referral rewards, get a complete skincare ecosystem built for Indian weather.
          </p>
        </div>

        {/* 5 AI Images Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Card 1: AI Skin Scan */}
          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-sm space-y-4 flex flex-col justify-between group hover:border-brand/40 transition-all">
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-ink-subtle border border-ink/10">
                <Image
                  src="/images/home-ai/ai_scan.png"
                  alt="AI skin check scan on smartphone"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  1. AI Camera Scan
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-ink">1. Instant AI Skin Check</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Reads hydration depth, texture smoothness, tone radiance, and barrier defense in 30 seconds inside your browser.
              </p>
            </div>
            <Link href="/face-analysis" className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold border-ink/20">
                <Camera className="w-3.5 h-3.5 text-brand" />
                <span>Try Free Camera Scan</span>
              </Button>
            </Link>
          </div>

          {/* Card 2: Skincare Products Shelf */}
          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-sm space-y-4 flex flex-col justify-between group hover:border-brand/40 transition-all">
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-ink-subtle border border-ink/10">
                <Image
                  src="/images/home-ai/products_shelf.png"
                  alt="Authorized skincare routine products shelf"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  2. Authorized Actives
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-ink">2. Minimalist & Derma Co</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Matched routines featuring Niacinamide, Salicylic Acid, Hyaluronic Acid, and Ceramides.
              </p>
            </div>
            <Link href="/shop" className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold border-ink/20">
                <Store className="w-3.5 h-3.5 text-brand" />
                <span>Browse Products</span>
              </Button>
            </Link>
          </div>

          {/* Card 3: 15-Minute Express Delivery */}
          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-sm space-y-4 flex flex-col justify-between group hover:border-brand/40 transition-all">
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-ink-subtle border border-ink/10">
                <Image
                  src="/images/home-ai/express_delivery.png"
                  alt="15-minute express doorstep delivery in Vijayawada"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-mint text-ink text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  3. 15-Min Delivery
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-ink">3. Express Doorstep Dispatch</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Dispatched from nearest neighborhood pharmacy hub directly to your door in Vijayawada.
              </p>
            </div>
            <Link href="/store" className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold border-ink/20">
                <Truck className="w-3.5 h-3.5 text-brand" />
                <span>Check Delivery Hubs</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Promo Cards: Referral & Vendor Partner Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Card 4: Referral Rewards Program */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-ink-subtle border border-ink/10">
                <Image
                  src="/images/home-ai/referral_rewards.png"
                  alt="GLOW VAI referral program rewards app"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  4. Referral Program
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-bold border border-brand/20">
                  <Gift className="w-3.5 h-3.5" />
                  <span>Referral Rewards Program</span>
                </div>

                <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
                  Invite Friends & <span className="text-brand">Earn ₹100 Wallet Cash</span>
                </h3>

                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Share your personal skin scan link with friends. When they complete their first AI scan and routine order, both of you earn instant ₹100 wallet credit!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-ink-subtle p-3 rounded-2xl border border-ink/10">
                  <span className="font-display font-bold text-xl text-brand block">₹100</span>
                  <span className="text-[11px] font-semibold text-ink-muted">Per Friend Referral</span>
                </div>
                <div className="bg-ink-subtle p-3 rounded-2xl border border-ink/10">
                  <span className="font-display font-bold text-xl text-brand block">Instant</span>
                  <span className="text-[11px] font-semibold text-ink-muted">WhatsApp Reward</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/referral" className="w-full">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-2xl shadow-md text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Join Partner Referral Program</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 5: Vendor Partner Network Store */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-ink-subtle border border-ink/10">
                <Image
                  src="/images/home-ai/vendor_store.png"
                  alt="Authorized vendor pharmacy partner store"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-mint text-ink text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  5. Vendor Partner Stores
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-mint text-ink px-3 py-1 rounded-full text-xs font-bold border border-mint">
                  <Store className="w-3.5 h-3.5" />
                  <span>Authorized Vendor Hub Network</span>
                </div>

                <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
                  Authorized Stores in <span className="text-brand">Vijayawada</span>
                </h3>

                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Powered by local authorized pharmacy & cosmetic hubs in Vijayawada. Fresh batch products dispatched straight to your doorstep in 15 minutes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-ink-subtle p-3 rounded-2xl border border-ink/10 flex items-center gap-2.5">
                  <Truck className="w-5 h-5 text-brand shrink-0" />
                  <div>
                    <span className="font-display font-bold text-xs text-ink block">15 Min Express</span>
                    <span className="text-[10px] text-ink-muted">Doorstep dispatch</span>
                  </div>
                </div>

                <div className="bg-ink-subtle p-3 rounded-2xl border border-ink/10 flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
                  <div>
                    <span className="font-display font-bold text-xs text-ink block">Verified Genuine</span>
                    <span className="text-[10px] text-ink-muted">Brand sealed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/store" className="w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-ink/20 hover:bg-ink-subtle text-ink font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4 text-brand" />
                  <span>Explore Partner Stores & Products</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
