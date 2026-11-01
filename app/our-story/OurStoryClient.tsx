"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, ScanLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { storyData } from "@/config/story";

const facts = [
  { k: "Free", v: "Face scan in about 30 seconds" },
  { k: "Local", v: "Built in Andhra Pradesh" },
  { k: "Independent", v: "We retail skincare, we do not make it" },
];

const faqs = [
  { q: "What is GLOW VAI?", a: "GLOW VAI is an Indian skincare retail brand offering a free face scan and WhatsApp ordering." },
  {
    q: "Who founded GLOW VAI?",
    a: "GLOW VAI was founded by Sardar Musthafa (Founder), Rehmit (Co-Founder and Head of Marketing, Sales and Revenue), and Nalla Satvik (Co-Founder and Technical Lead) in Andhra Pradesh, India.",
  },
  { q: "Does GLOW VAI make its own products?", a: "No. GLOW VAI is an independent retailer and does not manufacture the products it sells." },
  { q: "How do I contact GLOW VAI?", a: "Email contact@glowvai.in, or call or WhatsApp +91 89778 55998." },
];

const tabRing = focusRing;

export default function OurStoryClient() {
  const [fi, setFi] = useState(0);
  const [ti, setTi] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const founder = storyData.founders[fi];
  const evt = storyData.timeline[ti];

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="md" labelledBy="story-hero">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className={`underline underline-offset-4 rounded ${focusRing}`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">Our story</li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-end">
          <div className="lg:col-span-8">
            <Eyebrow>About GLOW VAI</Eyebrow>
            <h1
              id="story-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.75rem,1.6rem+5.2vw,5.5rem)] leading-[0.98] tracking-[-0.035em]"
            >
              Skincare that starts with a <span className="text-brand">selfie.</span>
            </h1>
            <p className="mt-7 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[52ch]">
              GLOW VAI is an Indian skincare retail brand. We pair a free face scan with simple ordering, so choosing a routine is
              clear and quick.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link href="/face-analysis">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  <ScanLine className="w-5 h-5" aria-hidden="true" />
                  <span>Scan my face, free</span>
                </Button>
              </Link>
              <Link
                href="/shop"
                className={`inline-flex items-center gap-2 font-medium underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
              >
                <span>or browse the shop</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ul className="lg:col-span-4 border-t border-ink/20">
            {facts.map((f) => (
              <li key={f.k} className="py-4 border-b border-ink/20">
                <p className="font-display font-semibold text-2xl">{f.k}</p>
                <p className="text-[15px] text-ink-muted">{f.v}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Founders: pick one, read their story in place */}
      <Section tone="deep" labelledBy="founders-title" id="founders">
        <Eyebrow>Founding team</Eyebrow>
        <SectionTitle id="founders-title" className="mt-4 max-w-[20ch]">
          Meet the three founders.
        </SectionTitle>
        <p className="mt-4 text-ink-muted max-w-[56ch]">Pick a name to read their story.</p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
          <div role="tablist" aria-label="Founders" className="lg:col-span-4 border-t border-ink/20 self-start">
            {storyData.founders.map((f, i) => (
              <button
                key={f.id}
                role="tab"
                id={`tab-${f.id}`}
                aria-selected={i === fi}
                aria-controls="founder-panel"
                type="button"
                onClick={() => {
                  setFi(i);
                  setOpen(0);
                }}
                className={`w-full flex items-center gap-4 text-left py-4 px-3 border-b border-ink/20 ${tabRing} ${i === fi ? "bg-white" : "hover:bg-white/60"}`}
              >
                <span className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden bg-paper">
                  <Image src={f.image} alt="" fill sizes="56px" className={`object-cover ${f.id === "rahimath" ? "object-top" : "object-center"}`} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-semibold text-lg leading-tight">{f.name}</span>
                  <span className="block text-sm text-ink-muted">{f.role}</span>
                </span>
              </button>
            ))}
          </div>

          <div id="founder-panel" role="tabpanel" aria-labelledby={`tab-${founder.id}`} className="lg:col-span-8 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
              <div className="relative aspect-[4/5] rounded-[10px] overflow-hidden bg-paper">
                <Image
                  src={founder.image}
                  alt={`${founder.name}, ${founder.role} at GLOW VAI`}
                  fill
                  sizes="(max-width: 640px) 80vw, 200px"
                  className={`object-cover ${founder.id === "rahimath" ? "object-top" : "object-center"}`}
                />
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {founder.location}
                </p>
                <h3 className="mt-2 font-display font-semibold text-3xl leading-tight">{founder.name}</h3>
                <p className="text-brand font-semibold">{founder.role}</p>
                <p className="mt-4 text-lg leading-snug text-ink">&ldquo;{founder.tagline}&rdquo;</p>
                <p className="mt-4 font-display font-semibold text-lg">{founder.storyTitle}</p>
                <p className="text-sm text-ink-muted">{founder.storySubtitle}</p>
              </div>
            </div>

            <ul className="mt-8 border-t border-ink/20">
              {founder.sections.map((sec, i) => (
                <li key={sec.title} className="border-b border-ink/20">
                  <h4>
                    <button
                      type="button"
                      aria-expanded={open === i}
                      onClick={() => setOpen(open === i ? null : i)}
                      className={`w-full flex items-center justify-between gap-4 py-4 text-left font-display font-semibold text-lg ${focusRing}`}
                    >
                      <span>
                        <span className="font-mono text-sm text-brand mr-3">{String(i + 1).padStart(2, "0")}</span>
                        {sec.title}
                      </span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  </h4>
                  {open === i && (
                    <div className="pb-5 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-[68ch]">
                      {sec.content.map((p, k) => (
                        <p key={k}>{p}</p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Timeline: pick a period */}
      <Section labelledBy="timeline-title">
        <Eyebrow>Milestones</Eyebrow>
        <SectionTitle id="timeline-title" className="mt-4 max-w-[22ch]">
          From a conversation to a company.
        </SectionTitle>
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
          <div role="tablist" aria-label="Timeline" aria-orientation="vertical" className="lg:col-span-4 border-t border-ink/20 self-start">
            {storyData.timeline.map((e, i) => (
              <button
                key={e.period}
                role="tab"
                id={`ev-${i}`}
                aria-selected={i === ti}
                aria-controls="event-panel"
                type="button"
                onClick={() => setTi(i)}
                className={`w-full text-left py-4 px-3 border-b border-ink/20 ${tabRing} ${i === ti ? "bg-brand text-white" : "hover:bg-paper-deep"}`}
              >
                <span className={`block font-mono text-xs uppercase tracking-[0.12em] ${i === ti ? "text-white/85" : "text-ink-muted"}`}>{e.period}</span>
                <span className="block font-display font-semibold text-base leading-snug">{e.title}</span>
              </button>
            ))}
          </div>
          <div id="event-panel" role="tabpanel" aria-labelledby={`ev-${ti}`} className="lg:col-span-8 border-t-2 border-ink pt-6 flex flex-col justify-between gap-10 min-h-[420px]">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.12em] text-brand">{evt.period}</p>
              <h3 className="mt-2 font-display font-semibold text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight">{evt.title}</h3>
              <ul className="mt-5 space-y-3 text-[17px] leading-relaxed text-ink-muted max-w-[62ch]">
                {evt.description.map((d, i) => (
                  <li key={i} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-ink">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p aria-hidden="true" className="font-display font-semibold leading-[0.8] tracking-[-0.06em] text-brand text-[clamp(7rem,4rem+12vw,13rem)] [font-feature-settings:'tnum']">
                {String(ti + 1).padStart(2, "0")}
                <span className="text-ink/25 text-[0.35em] tracking-normal"> / {String(storyData.timeline.length).padStart(2, "0")}</span>
              </p>
              <div className="mt-6 h-1.5 rounded-[3px] bg-ink/10 overflow-hidden" role="progressbar" aria-label="Story progress" aria-valuemin={1} aria-valuemax={storyData.timeline.length} aria-valuenow={ti + 1}>
                <div className="h-full bg-brand transition-all" style={{ width: `${((ti + 1) / storyData.timeline.length) * 100}%` }} />
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTi(Math.max(0, ti - 1))}
                  disabled={ti === 0}
                  className={`inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[10px] border border-ink/25 bg-white font-semibold disabled:opacity-40 ${focusRing}`}
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setTi(Math.min(storyData.timeline.length - 1, ti + 1))}
                  disabled={ti === storyData.timeline.length - 1}
                  className={`inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[10px] bg-brand text-white font-semibold disabled:opacity-40 ${focusRing}`}
                >
                  Next <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" tone="deep" labelledBy="story-faq" pad="tight">
        <SectionTitle id="story-faq">Questions about GLOW VAI</SectionTitle>
        <ul className="mt-8 border-t border-ink/20 max-w-[860px]">
          {faqs.map((f, i) => (
            <li key={f.q} className="border-b border-ink/20">
              <h3>
                <button
                  type="button"
                  aria-expanded={faqOpen === i}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className={`w-full flex items-center justify-between gap-4 py-5 text-left font-display font-semibold text-lg ${focusRing}`}
                >
                  {f.q}
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </h3>
              {faqOpen === i && <p className="pb-5 text-ink-muted max-w-[62ch]">{f.a}</p>}
            </li>
          ))}
        </ul>
      </Section>

      {/* Closing */}
      <Section tone="ink" labelledBy="story-cta" pad="md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8">
            <SectionTitle id="story-cta" tone="dark" className="max-w-[22ch]">
              Free skin checks for everyone with a smartphone.
            </SectionTitle>
            <p className="mt-4 text-white/80 max-w-[52ch]">GLOW VAI Retail, Andhra Pradesh, India.</p>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3">
            <Link href="/face-analysis">
              <Button variant="primary" size="lg" className="w-full bg-white !text-ink hover:bg-paper">
                <span>Scan my face, free</span>
              </Button>
            </Link>
            <Link href="/shop" className="text-white underline underline-offset-[5px] font-medium rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white">
              Explore skincare products
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
