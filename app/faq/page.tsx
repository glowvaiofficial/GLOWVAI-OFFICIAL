import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildFAQSchema } from "@/lib/seo/schema/faq";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";

export const metadata: Metadata = {
  title: "Frequently Asked Questions & Support",
  description: "Find instant answers regarding GLOW VAI 15-minute quick commerce delivery, AI skin face scan analysis, return policies, and product formulations.",
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
  openGraph: {
    title: "Frequently Asked Questions & Support | GLOW VAI",
    description: "Instant answers regarding GLOW VAI delivery, AI face scan, return policies, and product formulations.",
    url: `${SITE_URL}/faq`,
  },
};

const faqList = [
  {
    question: "How does GLOW VAI deliver skincare in 15 minutes?",
    answer: "Orders are packed at partner stores in Vijayawada and sent by rider. The 15-minute time is an estimate for covered areas and depends on distance, traffic and stock.",
  },
  {
    question: "Is the AI Face Scan free and private?",
    answer: "Yes. The scan is free. Your photo is sent to us only when you submit your report, and it is stored privately. Delete your data anytime at contact@glowvai.in.",
  },
  {
    question: "What products are available on GLOW VAI?",
    answer: "We stock skincare routines for breakouts, dullness, dark spots, dehydration and sun protection. See the shop for the full range.",
  },
  {
    question: "What happens if a product arrives damaged?",
    answer: "Contact support by email or WhatsApp within 48 hours of delivery with a photo. We issue a replacement or a full refund. See the returns page for details.",
  },
  {
    question: "What locations do you currently service?",
    answer: "We deliver in covered areas of Vijayawada. Check your pincode on the homepage or the delivery page to see if we reach you.",
  },
  {
    question: "How can I join the GLOW VAI partner referral program?",
    answer: "Register on the referral page as an auto driver or campus ambassador. You earn ₹10 for each verified referral, plus a ₹1,000 bonus at 100 verified referrals in a month.",
  },
];

const link = `underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`;

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    ...buildFAQSchema(faqList, "/faq"),
  };

  return (
    <div className="bg-paper text-ink">
      <JsonLd data={faqSchema} />

      <Section pad="md" labelledBy="faq-title">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className={link}>Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">FAQ</li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
          <div className="lg:col-span-5">
            <Eyebrow>Support center</Eyebrow>
            <h1 id="faq-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]">
              Questions, answered.
            </h1>
            <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[40ch]">
              The face scan, express delivery and routine recommendations, in plain words.
            </p>
            <div className="mt-8 border-t border-ink/20 pt-6 space-y-3 text-[15px]">
              <p>
                <a href="tel:+918977855998" className={`font-semibold ${link}`}>+91 89778 55998</a>
              </p>
              <p>
                <a href="mailto:contact@glowvai.in" className={`font-semibold ${link}`}>contact@glowvai.in</a>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ul className="border-t border-ink/20">
              {faqList.map((item) => (
                <li key={item.question} className="border-b border-ink/20">
                  <details className="group">
                    <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display font-semibold text-lg sm:text-xl rounded ${focusRing} [&::-webkit-details-marker]:hidden`}>
                      <span>{item.question}</span>
                      <span aria-hidden="true" className="font-mono text-xl text-brand transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="pb-6 pr-10 text-[17px] leading-relaxed text-ink-muted max-w-[62ch]">{item.answer}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="deep" pad="tight" labelledBy="faq-more">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <SectionTitle id="faq-more">Still have a question?</SectionTitle>
            <p className="mt-3 text-ink-muted max-w-[52ch]">Our team in Andhra Pradesh replies on working days, or use the help center for order and payment questions.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/help" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
              Help center
            </Link>
            <Link href="/contact" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}>
              Contact us
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
