import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { AlertCircle, FileText, Mail, ShieldCheck } from "lucide-react";

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

export default function TermsPage() {
  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <Container size="md">
        
        {/* Lawyer Review Banner - rendered while LEGAL_APPROVED is false */}
        {!siteConfig.LEGAL_APPROVED && (
          <div className="bg-yellow/30 border border-yellow/50 p-4 rounded-2xl mb-8 text-xs text-ink font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-ink shrink-0" />
            <span>DRAFT for lawyer review. Do not publish as final without legal approval.</span>
          </div>
        )}

        <div className="max-w-[70ch] mx-auto space-y-8">
          <div className="space-y-3">
            <Badge variant="brand" size="sm">
              Legal Agreement
            </Badge>
            <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
              Terms & Conditions
            </h1>
            <p className="text-xs text-ink-muted">Last updated: October 2026</p>
          </div>

          <div className="prose text-sm leading-relaxed space-y-6 text-ink-muted border-t border-ink/10 pt-6">
            
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">1. Acceptance of Terms</h2>
              <p>
                By accessing, browsing, or using {BRAND_NAME} (&ldquo;the Platform&rdquo;), operated by {siteConfig.legalName}, you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue using the website and face analysis tools.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">2. Age Limit & Eligibility</h2>
              <p>
                The skin scan service and product purchase options are available only to persons who are 18 years of age or older and capable of forming legally binding contracts under Indian law.
              </p>
            </section>

            <section className="space-y-2 bg-skymist/40 p-4 rounded-2xl border border-brand/15 text-ink">
              <h2 className="font-display font-bold text-base text-brand">3. Cosmetic Insights Disclaimer (Not Medical Advice)</h2>
              <p className="text-xs">
                The skin analysis provides <strong className="text-ink">cosmetic skin insights only</strong>. It does NOT provide dermatological diagnoses or medical treatment recommendations. For medical skin conditions, allergies, or persistent acne, always consult a licensed medical professional or dermatologist.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">4. Patch Testing & Customer Care</h2>
              <p className="text-xs">
                Before applying any new cosmetic product to your face, you are strongly advised to perform a patch test behind the ear 24 hours prior to full face application. GLOW VAI is not liable for adverse reactions resulting from failure to patch test or un-disclosed allergies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">5. Pricing, Orders & Cancellation</h2>
              <p className="text-xs">
                All prices are listed in Indian Rupees (INR) and are inclusive of GST. Orders may be cancelled within 10 minutes of placement or before dispatch. We reserve the right to cancel orders due to stock unavailability or pricing errors.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">6. Shipping & Delivery Terms</h2>
              <p className="text-xs">
                Delivery estimates (such as doorstep express delivery) are operational goals based on hub proximity and traffic conditions. Deliveries may experience delays during extreme weather or high volume periods. For full details on returns, see our <Link href="/returns" className="text-brand font-bold underline">Returns & Refund Policy</Link>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">7. Intellectual Property & User Feedback Licence</h2>
              <p className="text-xs">
                All content, trademarks, graphics, and code on {BRAND_NAME} are the exclusive property of {siteConfig.legalName}. When you submit feedback or product reviews and opt-in to publish, you grant us a non-exclusive, royalty-free licence to display your review on our platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">8. Limitation of Liability</h2>
              <p className="text-xs">
                To the maximum extent permitted by Indian law, {siteConfig.legalName} shall not be liable for indirect, incidental, or consequential damages arising from website usage or product application beyond the purchase price of the product.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">9. Governing Law & Dispute Resolution</h2>
              <p className="text-xs">
                These terms are governed by the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of courts located in Hyderabad, Telangana.
              </p>
            </section>

            <section className="bg-skymist/30 p-4 rounded-2xl border border-ink/10 space-y-1 text-xs text-ink-muted">
              <h3 className="font-bold text-sm text-ink">Need Legal Assistance?</h3>
              <p>Contact us at <a href={`mailto:${siteConfig.supportEmail}`} className="text-brand underline">{siteConfig.supportEmail}</a> or write to {siteConfig.legalName}, {siteConfig.address}.</p>
            </section>

          </div>
        </div>

      </Container>
    </div>
  );
}
