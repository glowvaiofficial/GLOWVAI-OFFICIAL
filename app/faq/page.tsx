import React from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { HelpCircle, Phone, Mail } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildFAQSchema } from "@/lib/seo/schema/faq";
import { SITE_URL } from "@/lib/site-url";

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
    answer: "We operate dedicated neighborhood dark store micro-hubs in Vijayawada & Visakhapatnam. Once you order, electric riders pack and dispatch cold-chain products within 3 minutes of order placement."
  },
  {
    question: "Is the AI Face Scan free and private?",
    answer: "Yes. The scan is free. Your photo is sent to us only when you submit your report, and it is stored privately. Delete your data anytime at contact@glowvai.in."
  },
  {
    question: "What products are available on GLOW VAI?",
    answer: "We stock skincare routines for acne, dullness, dark spots, dryness and sun protection. See the shop for the full range."
  },
  {
    question: "What happens if a product arrives damaged?",
    answer: "We offer an immediate replacement guarantee. Contact customer support via call or email within 24 hours of delivery."
  },
  {
    question: "What locations do you currently service?",
    answer: "We currently offer 15-minute express delivery across key pincodes in Vijayawada and Visakhapatnam. Enter your 6-digit pincode on our homepage or delivery page to check real-time coverage."
  },
  {
    question: "How can I join the GLOW VAI Partner Referral Program?",
    answer: "You can sign up on our Referral page to earn commission on every friend or campus student who orders using your referral code."
  }
];

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    ...buildFAQSchema(faqList, "/faq"),
  };

  return (
    <main className="min-h-screen bg-ink-subtle text-ink py-12 sm:py-20">
      <JsonLd data={faqSchema} />
      <Container>
        {/* Page Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <span className="text-xs font-semibold text-brand uppercase tracking-widest bg-skymist px-3 py-1 rounded-full border border-brand/20 inline-block">
            Support Center
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl text-ink leading-tight">
            Frequently Asked <span className="text-brand">Questions</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-muted font-normal leading-relaxed">
            Everything you need to know about our AI Face Scanner, express dark store delivery, and skincare routine recommendations.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto space-y-4 mb-16">
          {faqList.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-ink/10 shadow-sm hover:shadow-md transition-shadow space-y-2">
              <h2 className="font-display font-bold text-lg text-ink flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <span>{item.question}</span>
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed pl-8">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        {/* Contact Support Box */}
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-brand to-brand-dark text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-brand/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="font-display font-bold text-2xl text-white">Still have questions?</h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              Our customer support team in Andhra Pradesh is ready to assist you.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <a href="tel:+918977855998" className="px-5 py-3 bg-yellow hover:bg-yellow-hover text-ink font-bold text-xs rounded-2xl shadow-md transition-transform hover:scale-105 flex items-center gap-2">
              <Phone className="w-4 h-4 text-ink" />
              <span>+91 89778 55998</span>
            </a>
            <a href="mailto:contact@glowvai.in" className="px-5 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl border border-white/30 flex items-center gap-2">
              <Mail className="w-4 h-4 text-white" />
              <span>contact@glowvai.in</span>
            </a>
          </div>
        </div>
      </Container>
    </main>
  );
}
