import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { DocPage, DocSection } from "@/components/pages/DocPage";
import { focusRing } from "@/components/home/shared";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions governing the use of GLOW VAI skin analysis and product purchases.",
  robots: {
    index: siteConfig.LEGAL_APPROVED,
    follow: true,
  },
  alternates: { canonical: `${SITE_URL}/terms` },
};

const sections = [
  { id: "acceptance", title: "1. Acceptance of terms" },
  { id: "age", title: "2. Age limit and eligibility" },
  { id: "insights", title: "3. Cosmetic insights disclaimer" },
  { id: "patch", title: "4. Patch testing and customer care" },
  { id: "pricing", title: "5. Pricing, orders and cancellation" },
  { id: "shipping", title: "6. Shipping and delivery terms" },
  { id: "ip", title: "7. Intellectual property and feedback licence" },
  { id: "liability", title: "8. Limitation of liability" },
  { id: "law", title: "9. Governing law and disputes" },
];

const link = `text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`;

export default function TermsPage() {
  return (
    <DocPage
      id="terms-title"
      eyebrow="Legal agreement"
      title="Terms and conditions."
      updated="October 2026"
      draft={!siteConfig.LEGAL_APPROVED}
      sections={sections}
    >
      <DocSection id="acceptance" title={sections[0].title}>
        <p>
          By accessing, browsing, or using {BRAND_NAME} (&ldquo;the Platform&rdquo;), operated by {siteConfig.legalName}, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please discontinue using the website and face analysis tools.
        </p>
      </DocSection>

      <DocSection id="age" title={sections[1].title}>
        <p>The skin scan service and product purchase options are available only to persons who are 18 years of age or older and capable of forming legally binding contracts under Indian law.</p>
      </DocSection>

      <DocSection id="insights" title={sections[2].title}>
        <p>
          The skin analysis provides <strong className="font-semibold text-ink">cosmetic skin insights only</strong>. It does NOT provide dermatological diagnoses or medical treatment recommendations. For medical skin conditions, allergies, or persistent acne, always consult a licensed medical professional or dermatologist.
        </p>
      </DocSection>

      <DocSection id="patch" title={sections[3].title}>
        <p>
          Before applying any new cosmetic product to your face, you are strongly advised to perform a patch test behind the ear 24 hours prior to full face application. GLOW VAI is not liable for adverse reactions resulting from failure to patch test or un-disclosed allergies.
        </p>
      </DocSection>

      <DocSection id="pricing" title={sections[4].title}>
        <p>
          All prices are listed in Indian Rupees (INR) and are inclusive of GST. Orders may be cancelled within 10 minutes of placement or before dispatch. We reserve the right to cancel orders due to stock unavailability or pricing errors.
        </p>
      </DocSection>

      <DocSection id="shipping" title={sections[5].title}>
        <p>
          Delivery estimates (such as doorstep express delivery) are operational goals based on hub proximity and traffic conditions. Deliveries may experience delays during extreme weather or high volume periods. For full details on returns, see our{" "}
          <Link href="/returns" className={link}>Returns and refund policy</Link>.
        </p>
      </DocSection>

      <DocSection id="ip" title={sections[6].title}>
        <p>
          All content, trademarks, graphics, and code on {BRAND_NAME} are the exclusive property of {siteConfig.legalName}. When you submit feedback or product reviews and opt-in to publish, you grant us a non-exclusive, royalty-free licence to display your review on our platform.
        </p>
      </DocSection>

      <DocSection id="liability" title={sections[7].title}>
        <p>
          To the maximum extent permitted by Indian law, {siteConfig.legalName} shall not be liable for indirect, incidental, or consequential damages arising from website usage or product application beyond the purchase price of the product.
        </p>
      </DocSection>

      <DocSection id="law" title={sections[8].title}>
        <p>
          These terms are governed by the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of courts located in Hyderabad, Telangana.
        </p>
      </DocSection>

      <DocSection id="legal-help" title="Need legal assistance?">
        <p>
          Contact us at <a href={`mailto:${siteConfig.supportEmail}`} className={link}>{siteConfig.supportEmail}</a> or write to {siteConfig.legalName}, {siteConfig.address}.
        </p>
      </DocSection>
    </DocPage>
  );
}
