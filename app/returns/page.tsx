import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { ShieldCheck, RotateCcw, AlertCircle, Mail, CheckCircle2 } from "lucide-react";

import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";

export const metadata: Metadata = {
  title: "Returns & Refund Policy",
  description: "Learn about the GLOW VAI 14-day Skin Satisfaction Guarantee and return policy.",
  alternates: { canonical: `${SITE_URL}/returns` },
  openGraph: {
    title: "Returns & Refund Policy | GLOW VAI",
    description: "Learn about the GLOW VAI 14-day Skin Satisfaction Guarantee and return policy.",
    url: `${SITE_URL}/returns`,
  },
};

export default function ReturnsPage() {
  const isProd = process.env.NODE_ENV === "production";
  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema(
      "/returns",
      "Returns & Refund Policy | GLOW VAI",
      "Learn about the GLOW VAI 14-day Skin Satisfaction Guarantee and return policy."
    ),
  };

  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <JsonLd data={pageSchema} />
      <Container size="md">
        
        {!isProd && (
          <div className="bg-yellow/30 border border-yellow/50 p-4 rounded-2xl mb-8 text-xs text-ink font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-ink shrink-0" />
            <span>DRAFT for lawyer review. Do not publish as final without legal approval.</span>
          </div>
        )}

        <div className="max-w-[70ch] mx-auto space-y-8">
          <div className="space-y-3">
            <Badge variant="brand" size="sm">
              14-Day Skin Satisfaction Guarantee
            </Badge>
            <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
              Returns & Refund Policy
            </h1>
            <p className="text-xs text-ink-muted">Last updated: October 2026</p>
          </div>

          <div className="prose text-sm leading-relaxed space-y-6 text-ink-muted border-t border-ink/10 pt-6">
            
            <section className="bg-skymist/40 p-5 rounded-2xl border border-brand/15 text-ink space-y-2">
              <h2 className="font-display font-bold text-base text-brand flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <span>1. Our 14-Day Skin Satisfaction Guarantee</span>
              </h2>
              <p className="text-xs">
                We want you to feel confident in every product you try. If a {BRAND_NAME} formula causes skin discomfort, irritation, or does not meet your expectations, you may request a return or product exchange within 14 days of receipt.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">2. Return Eligibility</h2>
              <p>To qualify for a return or replacement under our satisfaction guarantee:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>The return request must be submitted within 14 calendar days of delivery.</li>
                <li>The product must be at least 50% unconsumed (determined by weight or volume upon inspection).</li>
                <li>Items marked as final clearance or promotional gifts are non-refundable.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">3. Damaged or Defective Items</h2>
              <p className="text-xs">
                If your order arrives damaged, leaking, or defective, please take a photo and contact our support team at <a href={`mailto:${siteConfig.supportEmail}`} className="text-brand underline">{siteConfig.supportEmail}</a> within 48 hours of delivery. We will issue an immediate replacement or full refund without requiring a return.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">4. How to Request a Return</h2>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Email support at <a href={`mailto:${siteConfig.supportEmail}`} className="text-brand font-bold underline">{siteConfig.supportEmail}</a> or message us on WhatsApp.</li>
                <li>Provide your order number, phone number, and a brief description of why the formula did not suit your skin.</li>
                <li>Our support team will send you return instructions or arrange a doorstep reverse pickup where available.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">5. Refund Processing Timeline</h2>
              <p className="text-xs">
                Once your return is inspected and approved, refunds are credited back to your original payment method or UPI account within 5 to 7 business days.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">6. Non-Returnable Items</h2>
              <p className="text-xs">
                For hygiene and safety reasons under Indian cosmetics regulations, opened lip products or products that have been completely consumed cannot be returned unless verified as defective upon delivery.
              </p>
            </section>

            <section className="bg-skymist/30 p-5 rounded-2xl border border-ink/10 space-y-2 text-ink">
              <h2 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand" />
                <span>Contact Customer Support</span>
              </h2>
              <p className="text-xs text-ink-muted">
                Have questions about your order or return eligibility? Email us at <strong className="text-ink">{siteConfig.supportEmail}</strong> or call <strong className="text-ink">{siteConfig.phone}</strong>.
              </p>
            </section>

          </div>
        </div>

      </Container>
    </div>
  );
}
