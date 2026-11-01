import React from "react";
import type { Metadata } from "next";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { DocPage, DocSection, DocList } from "@/components/pages/DocPage";
import { focusRing } from "@/components/home/shared";
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

const sections = [
  { id: "guarantee", title: "1. Our 14-day skin satisfaction guarantee" },
  { id: "eligibility", title: "2. Return eligibility" },
  { id: "damaged", title: "3. Damaged or defective items" },
  { id: "how", title: "4. How to request a return" },
  { id: "refund", title: "5. Refund processing timeline" },
  { id: "non-returnable", title: "6. Non-returnable items" },
  { id: "contact", title: "7. Contact customer support" },
];

const link = `text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink font-semibold rounded ${focusRing}`;

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
    <>
      <JsonLd data={pageSchema} />
      <DocPage
        id="returns-title"
        eyebrow="14-day skin satisfaction guarantee"
        title="Returns and refunds."
        updated="October 2026"
        draft={!isProd}
        sections={sections}
      >
        <DocSection id="guarantee" title={sections[0].title}>
          <p>
            We want you to feel confident in every product you try. If a {BRAND_NAME} formula causes skin discomfort, irritation, or does not meet your expectations, you may request a return or product exchange within 14 days of receipt.
          </p>
        </DocSection>

        <DocSection id="eligibility" title={sections[1].title}>
          <p>To qualify for a return or replacement under our satisfaction guarantee:</p>
          <DocList
            items={[
              "The return request must be submitted within 14 calendar days of delivery.",
              "The product must be at least 50% unconsumed (determined by weight or volume upon inspection).",
              "Items marked as final clearance or promotional gifts are non-refundable.",
            ]}
          />
        </DocSection>

        <DocSection id="damaged" title={sections[2].title}>
          <p>
            If your order arrives damaged, leaking, or defective, please take a photo and contact our support team at{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className={link}>{siteConfig.supportEmail}</a> within 48 hours of delivery. We will issue an immediate replacement or full refund without requiring a return.
          </p>
        </DocSection>

        <DocSection id="how" title={sections[3].title}>
          <ol className="space-y-3">
            <li className="flex gap-3"><span className="font-mono text-sm text-brand pt-0.5">01</span><span>Email support at <a href={`mailto:${siteConfig.supportEmail}`} className={link}>{siteConfig.supportEmail}</a> or message us on WhatsApp.</span></li>
            <li className="flex gap-3"><span className="font-mono text-sm text-brand pt-0.5">02</span><span>Provide your order number, phone number, and a brief description of why the formula did not suit your skin.</span></li>
            <li className="flex gap-3"><span className="font-mono text-sm text-brand pt-0.5">03</span><span>Our support team will send you return instructions or arrange a doorstep reverse pickup where available.</span></li>
          </ol>
        </DocSection>

        <DocSection id="refund" title={sections[4].title}>
          <p>
            Once your return is inspected and approved, refunds are credited back to your original payment method or UPI account within 5 to 7 business days.
          </p>
        </DocSection>

        <DocSection id="non-returnable" title={sections[5].title}>
          <p>
            For hygiene and safety reasons under Indian cosmetics regulations, opened lip products or products that have been completely consumed cannot be returned unless verified as defective upon delivery.
          </p>
        </DocSection>

        <DocSection id="contact" title={sections[6].title}>
          <p>
            Have questions about your order or return eligibility? Email us at <strong className="font-semibold text-ink">{siteConfig.supportEmail}</strong> or call <strong className="font-semibold text-ink">{siteConfig.phone}</strong>.
          </p>
        </DocSection>
      </DocPage>
    </>
  );
}
