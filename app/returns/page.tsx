import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, RotateCcw, Clock, CheckCircle2, AlertCircle, ArrowRight, MessageCircle, Mail, Phone, HelpCircle } from "lucide-react";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";
import { emailFor } from "@/config/emails";
import { getAssetPath } from "@/lib/utils";

const DESC =
  "GLOW VAI 14-day Skin Satisfaction Guarantee. Easy reverse pickups in Vijayawada, replacement for transit damage, and instant UPI refund processing.";

export const metadata: Metadata = {
  title: "Returns & Refund Policy | 14-Day Skin Guarantee | GLOW VAI",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/returns` },
  openGraph: {
    title: "Returns & Refund Policy | 14-Day Skin Guarantee | GLOW VAI",
    description: DESC,
    url: `${SITE_URL}/returns`,
  },
};

const refundTimelines = [
  { method: "UPI (Google Pay, PhonePe, Paytm)", speed: "Instant – 4 Hours", note: "Processed immediately after inspection" },
  { method: "Debit / Credit Cards", speed: "3 – 5 Business Days", note: "Depends on bank clearance cycles" },
  { method: "Net Banking", speed: "2 – 4 Business Days", note: "Direct bank transfer to originating account" },
  { method: "Cash on Delivery (COD)", speed: "Within 24 Hours", note: "Transferred via UPI to customer mobile number" },
];

export default function ReturnsPage() {
  const mail = emailFor("returns");
  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema(
      "/returns",
      "Returns & Refund Policy | GLOW VAI",
      DESC
    ),
  };

  return (
    <div className="bg-paper text-ink">
      <JsonLd data={pageSchema} />

      {/* Hero */}
      <Section pad="md" labelledBy="returns-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>14-Day Skin Satisfaction Guarantee</Eyebrow>
            <h1
              id="returns-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
            >
              Skincare that fits, or <span className="text-brand">your money back.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[50ch]">
              We want you to feel complete confidence in your routine. If any formula causes skin irritation, discomfort, or fails to meet expectations, request a free exchange or refund within 14 days.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={`https://wa.me/918977855998?text=${encodeURIComponent("Hello GLOW VAI, I would like to request a return or replacement for my order.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" size="lg">
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  <span>Start Return on WhatsApp</span>
                </Button>
              </a>
              <a href={`mailto:${mail}?subject=Return Request`} className={`inline-flex items-center gap-2 font-medium underline underline-offset-4 rounded ${focusRing}`}>
                or email {mail}
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-ink/15 shadow-sm bg-paper-deep">
              <Image
                src={getAssetPath("/images/hero/skincare-studio-hero.jpg")}
                alt="GLOW VAI clean formulas and guarantee"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* How It Works: 3 Steps */}
      <Section tone="deep" pad="tight" labelledBy="process-title">
        <Eyebrow>Simple Process</Eyebrow>
        <SectionTitle id="process-title" className="mt-2">How to request a return in 3 steps</SectionTitle>
        <p className="mt-3 text-ink-muted max-w-xl">
          No long phone queues or complicated paperwork. You can initiate a return or exchange in under 60 seconds.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
            <span className="font-mono text-sm text-brand font-semibold">01</span>
            <h3 className="font-display font-semibold text-xl text-ink">Message our Support</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Send a quick message via WhatsApp or email with your registered phone number or Order ID and a 1-line note of what went wrong.
            </p>
          </div>

          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
            <span className="font-mono text-sm text-brand font-semibold">02</span>
            <h3 className="font-display font-semibold text-xl text-ink">Free Doorstep Pickup</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              In covered Vijayawada pincodes, a rider will collect the package directly from your address. For transit damage, we waive return pickup completely!
            </p>
          </div>

          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
            <span className="font-mono text-sm text-brand font-semibold">03</span>
            <h3 className="font-display font-semibold text-xl text-ink">Instant Refund / Swap</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Choose an immediate replacement bottle calibrated to your skin, or receive an instant refund straight to your UPI account or card.
            </p>
          </div>
        </div>
      </Section>

      {/* Refund Timelines Table */}
      <Section pad="md" labelledBy="refund-timelines-title">
        <div className="max-w-[760px] mb-8">
          <Eyebrow>Payment Settlement</Eyebrow>
          <SectionTitle id="refund-timelines-title" className="mt-2">Refund Processing Times</SectionTitle>
          <p className="mt-3 text-ink-muted">
            We process approved refunds immediately upon verification without holding your funds.
          </p>
        </div>

        <div className="bg-white border border-ink/15 rounded-[24px] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/15 bg-paper-deep text-ink">
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Payment Mode</th>
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Turnaround Time</th>
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 text-sm">
                {refundTimelines.map((row) => (
                  <tr key={row.method} className="hover:bg-paper/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-ink">{row.method}</td>
                    <td className="py-4 px-6 font-mono text-brand font-medium">{row.speed}</td>
                    <td className="py-4 px-6 text-ink-muted">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Eligibility Checklist */}
      <Section tone="deep" pad="tight" labelledBy="eligibility-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            <SectionTitle id="eligibility-title">What qualifies for return?</SectionTitle>
            <ul className="space-y-3 pt-2">
              {[
                "Request initiated within 14 calendar days of delivery handoff.",
                "Product bottle is at least 50% remaining (we want you to try it fairly).",
                "Delivered items that arrived leaked, crushed, or defective (automatic instant replacement).",
                "Adverse skin reaction (rash, redness, persistent itchiness) verified with our advisor.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5C3B] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <SectionTitle id="non-returnable-title">Non-returnable exceptions</SectionTitle>
            <ul className="space-y-3 pt-2">
              {[
                "Empty or fully consumed bottles (greater than 50% used).",
                "Personal hygiene items with broken tamper-evident safety seals (e.g. lip care) unless received defective.",
                "Products purchased from unauthorized third-party resellers outside GLOW VAI.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <AlertCircle className="w-4 h-4 text-[#9B1C1C] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 bg-white border border-ink/15 rounded-[20px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-semibold text-2xl text-ink">Need help with an ongoing return?</h3>
            <p className="text-sm text-ink-muted mt-1">Our customer happiness team in Vijayawada is ready to assist you right now.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/918977855998"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors ${focusRing}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Us</span>
            </a>
            <a
              href={`mailto:${mail}`}
              className={`inline-flex items-center gap-2 min-h-[48px] px-6 rounded-[10px] border border-ink/25 bg-white font-semibold text-sm hover:border-ink transition-colors ${focusRing}`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
