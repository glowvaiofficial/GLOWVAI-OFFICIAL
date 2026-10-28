"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { storyData } from "@/config/story";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  MapPin, 
  UserCheck, 
  Truck, 
  Camera, 
  ChevronRight,
  BookOpen,
  HelpCircle
} from "lucide-react";

export default function OurStoryClient() {
  const [selectedFounderId, setSelectedFounderId] = useState<string | null>(null);

  const selectedFounder = storyData.founders.find((f) => f.id === selectedFounderId);

  const handleSelectFounder = (id: string) => {
    setSelectedFounderId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToStory = () => {
    setSelectedFounderId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bg-white text-ink min-h-screen">

      {/* ------------------------------------------------------------- */}
      {/* 1. DETAILED INDIVIDUAL FOUNDER STORY VIEW                      */}
      {/* ------------------------------------------------------------- */}
      {selectedFounder ? (
        <div className="py-10 sm:py-16 bg-ink-subtle text-ink animate-fadeIn">
          <Container size="md">
            
            {/* Top Navigation Back Button */}
            <div className="mb-8">
              <button
                onClick={handleBackToStory}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-skymist text-brand font-bold text-sm transition-all border-2 border-brand/30 shadow-md group cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Founding Team & Story</span>
              </button>
            </div>

            {/* Founder Profile Hero Header */}
            <div className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-brand/15 shadow-xl mb-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                
                {/* Founder Photo */}
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-4 border-brand shadow-lg shrink-0 bg-skymist">
                  <Image
                    src={selectedFounder.image}
                    alt={`${selectedFounder.name}, founder of GLOW VAI`}
                    fill
                    className={`object-cover ${selectedFounder.id === "rahimath" ? "object-top" : "object-center"}`}
                    priority
                  />
                </div>

                {/* Founder Info */}
                <div className="space-y-3 text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-bold uppercase tracking-wider">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{selectedFounder.role}</span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink">
                    {selectedFounder.name}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand" />
                      {selectedFounder.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-hover" />
                      GLOW VAI Founding Partner
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-ink-muted leading-relaxed italic pt-1 max-w-xl">
                    &ldquo;{selectedFounder.tagline}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Story Header */}
            <div className="mb-10 text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-brand">
                FOUNDER PERSONAL STORY
              </span>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
                {selectedFounder.storyTitle}
              </h2>
              <p className="text-sm text-ink-muted font-medium">
                {selectedFounder.storySubtitle}
              </p>
            </div>

            {/* Structured Story Sections */}
            <div className="space-y-8 max-w-3xl mx-auto">
              {selectedFounder.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 sm:p-8 rounded-2xl border border-ink/10 shadow-sm space-y-4 hover:border-brand/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      {idx + 1}
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink">
                      {sec.title}
                    </h3>
                  </div>

                  <div className="space-y-3 pl-0 sm:pl-11 text-ink-muted text-sm sm:text-base leading-relaxed font-normal">
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Back Button */}
            <div className="mt-12 text-center pt-8 border-t border-ink/10">
              <button
                onClick={handleBackToStory}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-brand hover:bg-brand-dark text-white font-bold text-sm transition-all shadow-lg hover:shadow-glow cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to GLOW VAI Founding Team</span>
              </button>
            </div>

          </Container>
        </div>
      ) : (

        /* ------------------------------------------------------------- */
        /* 2. MAIN OUR STORY PAGE VIEW                                  */
        /* ------------------------------------------------------------- */
        <div className="py-12 sm:py-20">
          <Container size="md">

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-8 text-xs text-ink-light">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-brand transition-colors font-medium">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-semibold text-ink">Our Story & Skincare Retail Brand</li>
              </ol>
            </nav>

            {/* ABOUT GLOW VAI OVERVIEW BLOCK */}
            <div className="bg-skymist/50 border-2 border-brand/20 p-6 sm:p-8 rounded-3xl mb-12 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>About GLOW VAI</span>
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-ink">
                GLOW VAI, the Indian Skincare Retailer
              </h2>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-normal">
                GLOW VAI is an Indian skincare retail brand offering a free AI face scan and instant WhatsApp ordering for authentic Minimalist and The Derma Co products. Founded in Andhra Pradesh, India, we make dermatological routine selection clear, fast, and reliable.
              </p>
            </div>

            {/* 1. HERO SECTION */}
            <div className="space-y-6 text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>GLOW VAI RETAIL & FREE AI FACE SCAN</span>
              </div>

              <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-ink leading-[1.1]">
                Skincare that starts with a <Accent>selfie</Accent>.
              </h1>

              <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
                GLOW VAI combines instant browser face skin analysis with WhatsApp ordering for authentic Minimalist and The Derma Co skincare routines across India.
              </p>
            </div>

            {/* QUICK HIGHLIGHT BANNER */}
            <div className="bg-gradient-to-r from-brand via-brand to-brand-dark p-8 sm:p-10 rounded-3xl text-white shadow-2xl mb-20 relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white text-brand flex items-center justify-center mx-auto shadow-md">
                    <Camera className="w-5 h-5 text-brand" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Free AI Face Scan</h3>
                  <p className="text-xs text-skymist leading-relaxed">
                    Evaluates skin hydration, barrier depth, and pore health in 30 seconds.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm space-y-2">
                  <div className="w-10 h-10 rounded-full bg-mint text-ink flex items-center justify-center mx-auto shadow-md">
                    <Zap className="w-5 h-5 text-ink" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Authentic Skincare</h3>
                  <p className="text-xs text-skymist leading-relaxed">
                    Independent retailer of Minimalist and The Derma Co routines.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm space-y-2">
                  <div className="w-10 h-10 rounded-full bg-yellow text-ink flex items-center justify-center mx-auto shadow-md">
                    <Truck className="w-5 h-5 text-ink" />
                  </div>
                  <h3 className="font-bold text-lg text-white">WhatsApp Ordering</h3>
                  <p className="text-xs text-skymist leading-relaxed">
                    Direct order dispatch and fast delivery across India.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. INTERACTIVE FOUNDING TEAM CARDS */}
            <div className="mb-28 space-y-10">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <Badge variant="brand" size="md">
                  FOUNDING TEAM
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                  Meet Our Founders
                </h2>
                <p className="text-sm text-ink-muted">
                  Click on any founder card below to read their background and vision for GLOW VAI.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {storyData.founders.map((f) => (
                  <div
                    key={f.id}
                    id={f.id}
                    onClick={() => handleSelectFounder(f.id)}
                    className="group bg-white rounded-3xl p-6 border-2 border-ink/10 hover:border-brand/60 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Photo */}
                      <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-skymist border border-ink/10 group-hover:scale-[1.02] transition-transform duration-500">
                        <Image
                          src={f.image}
                          alt={`${f.name}, ${f.role} at GLOW VAI`}
                          fill
                          className={`object-cover ${f.id === "rahimath" ? "object-top" : "object-center"}`}
                        />
                        <div className="absolute top-3 left-3 bg-ink/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
                          {f.location}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5">
                        <h3 className="font-display font-bold text-xl text-ink group-hover:text-brand transition-colors">
                          {f.name}
                        </h3>
                        <p className="text-xs font-bold text-brand uppercase tracking-wider">
                          {f.role}
                        </p>
                        <p className="text-xs text-ink-muted leading-relaxed pt-1 line-clamp-3">
                          {f.bio}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 mt-4 border-t border-ink/10">
                      <button className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md">
                        <BookOpen className="w-4 h-4" />
                        <span>Read {f.name.split(" ")[0]}&apos;s Full Story</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. GLOW VAI STARTUP MILESTONES TIMELINE */}
            <div className="mb-28 space-y-12">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <Badge variant="skymist" size="md">
                  CHRONOLOGICAL MILESTONES
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                  GLOW VAI: The Story Behind the Brand
                </h2>
                <p className="text-sm text-ink-muted">
                  From a conversation between friends to building an AI-powered skincare retail brand in Andhra Pradesh, India.
                </p>
              </div>

              {/* Timeline Items */}
              <div className="relative border-l-2 border-brand/30 ml-4 sm:ml-8 space-y-10 pl-6 sm:pl-10">
                {storyData.timeline.map((evt, idx) => (
                  <div key={idx} className="relative group">

                    {/* Dot Icon */}
                    <div className={`absolute -left-[31px] sm:-left-[47px] top-1.5 w-6 h-6 rounded-full border-4 ${evt.isKeyMilestone ? "bg-brand border-brand/30 shadow-lg scale-125" : "bg-white border-brand"}`} />

                    {/* Content Card */}
                    <div className={`p-6 rounded-2xl border transition-all ${evt.isKeyMilestone ? "bg-skymist/70 border-brand/40 shadow-sm" : "bg-white border-ink/10 hover:border-brand/20"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-display font-bold text-base sm:text-lg text-brand">
                          {evt.period}
                        </span>
                        {evt.badge && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                            {evt.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-bold text-lg text-ink mb-2">
                        {evt.title}
                      </h3>

                      <div className="space-y-1.5 text-xs sm:text-sm text-ink-muted leading-relaxed font-normal">
                        {evt.description.map((d, dIdx) => (
                          <p key={dIdx}>• {d}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. VISIBLE FAQ SECTION (FOR ENTITY DISAMBIGUATION & FAQ SCHEMA) */}
            <div id="faq" className="my-20 space-y-8">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <Badge variant="brand" size="md">
                  <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
                  FREQUENTLY ASKED QUESTIONS
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                  Frequently Asked Questions About GLOW VAI
                </h2>
                <p className="text-sm text-ink-muted">
                  Everything you need to know about GLOW VAI, our founders, and our retail offerings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-2xl border border-ink/10 shadow-sm space-y-2">
                  <h3 className="font-bold text-base text-ink">What is GLOW VAI?</h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    GLOW VAI is an Indian skincare retail brand offering a free AI face scan and instant WhatsApp ordering for authentic Minimalist and The Derma Co products.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-ink/10 shadow-sm space-y-2">
                  <h3 className="font-bold text-base text-ink">Who founded GLOW VAI?</h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    GLOW VAI was founded by SK Sardar Musthafa (Founder), Rehmit (Market Explorer), and Nalla Satvik (Co-Founder & Technical Lead) in Andhra Pradesh, India.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-ink/10 shadow-sm space-y-2">
                  <h3 className="font-bold text-base text-ink">Is GLOW VAI the same as Minimalist or The Derma Co?</h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    No. GLOW VAI is an independent retailer of Minimalist and The Derma Co products and does not manufacture them.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-ink/10 shadow-sm space-y-2">
                  <h3 className="font-bold text-base text-ink">How do I contact GLOW VAI?</h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    You can reach GLOW VAI by email at contact@glowvai.in or by telephone and WhatsApp at +91 89778 55998.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. MISSION & COMMITMENT */}
            <div className="my-20 py-12 px-8 bg-brand text-white rounded-3xl text-center space-y-4 shadow-2xl">
              <span className="text-xs font-bold tracking-widest text-yellow uppercase">
                OUR PROMISE
              </span>
              <p className="font-display text-xl sm:text-3xl font-bold max-w-2xl mx-auto leading-relaxed">
                Free AI skin checks for everyone with a smartphone, and reliable skincare retail ordering directly to your doorstep.
              </p>
              <p className="text-xs text-skymist font-medium pt-2">
                GLOW VAI Retail • Andhra Pradesh, India
              </p>
            </div>

            {/* 6. CLOSING CTA */}
            <div className="pt-4 text-center space-y-6">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                Ready to experience GLOW VAI?
              </h2>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link href="/face-analysis">
                  <Button variant="primary" size="lg" className="h-[52px] gap-2 shadow-coral-glow text-button-label bg-brand hover:bg-brand-dark">
                    <Camera className="w-5 h-5 text-white shrink-0" />
                    <span>Start Free AI Face Scan</span>
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button variant="outline" size="lg" className="h-[52px] gap-2 text-button-label">
                    <span>Explore Skincare Products</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Button>
                </Link>
              </div>
            </div>

          </Container>
        </div>
      )}
    </div>
  );
}
