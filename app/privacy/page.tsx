import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { DataRequestForm } from "@/components/privacy/DataRequestForm";
import { Lock, ShieldCheck, AlertCircle, FileText, Mail } from "lucide-react";

import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how GLOW VAI processes personal data and face scans under the DPDP Act 2023.",
  robots: {
    index: siteConfig.LEGAL_APPROVED,
    follow: true,
  },
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
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
              Data Governance Policy
            </Badge>
            <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-ink-muted">Last updated: October 2026</p>
          </div>

          <div className="prose text-sm leading-relaxed space-y-6 text-ink-muted border-t border-ink/10 pt-6">
            
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">1. Data Fiduciary & Identity</h2>
              <p>
                {siteConfig.legalName} (&ldquo;{BRAND_NAME}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this platform. For the purpose of India&apos;s Digital Personal Data Protection (DPDP) Act, 2023, we act as the Data Fiduciary responsible for determining the purpose and means of personal data processing.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">2. What Personal Data We Collect</h2>
              <p>When you use our website or face analysis tool, we collect the following categories of data:</p>
              <ul className="list-disc list-inside space-y-1.5 text-xs">
                <li><strong className="text-ink">Contact Details:</strong> Full name, phone number, and optional email address.</li>
                <li><strong className="text-ink">Technical Identifiers:</strong> IP address, browser type, operating system, referrer URL, and UTM parameters.</li>
                <li><strong className="text-ink">Location Data:</strong> Coarse geographic region (city and state) derived from IP lookup.</li>
                <li><strong className="text-ink">Consent Records:</strong> Timestamp, consent version ID, and opt-in choices.</li>
                <li><strong className="text-ink">Skin Assessment Scores:</strong> Hydration, texture, tone, and clarity numerical scores generated during scans.</li>
              </ul>
            </section>

            <section className="space-y-2 bg-skymist/50 p-5 rounded-2xl border border-brand/15 text-ink">
              <h2 className="font-display font-bold text-base text-brand flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>3. Photo Processing & Optional Storage</span>
              </h2>
              <p className="text-xs">
                Your photo is analysed on your phone inside your browser. If and only if you check the separate optional image consent box, your image is saved to secure private cloud storage for quality review and report generation. We delete stored photos after 90 days, or sooner upon request. Who can access stored face images: authorized internal systems engineers only.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">4. Third-Party Data Processors</h2>
              <p className="text-xs">
                We share personal data with vetted service providers acting as Data Processors strictly to provide our services:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong className="text-ink">Hosting & Infrastructure:</strong> Vercel Inc. / GitHub Pages (web hosting and static distribution).</li>
                <li><strong className="text-ink">Storage & Data Logging:</strong> Secure encrypted cloud storage (for lead records and optional photo backup).</li>
                <li><strong className="text-ink">Cross-Border Transfers:</strong> Data stored on cloud servers may involve processing outside India subject to standard security safeguards.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">5. Data Retention Schedule</h2>
              <ul className="list-disc list-inside space-y-1.5 text-xs">
                <li><strong className="text-ink">Face Images (with consent):</strong> Automatically purged after 90 days.</li>
                <li><strong className="text-ink">Lead & Contact Details:</strong> Retained for up to 24 months from last interaction or until consent is withdrawn.</li>
                <li><strong className="text-ink">Newsletter & Marketing List:</strong> Retained until you click unsubscribe or request deletion.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">6. Grievance Redressal Officer (DPDP Compliance)</h2>
              <p className="text-xs">
                In compliance with the DPDP Act 2023, you may address data protection concerns or grievances to our designated Data Protection Officer:
              </p>
              <div className="bg-skymist/40 p-4 rounded-xl text-xs space-y-1 text-ink border border-ink/10">
                <p><strong className="text-ink">Name:</strong> Grievance Officer, GLOW VAI Technologies</p>
                <p><strong className="text-ink">Email:</strong> <a href={`mailto:${siteConfig.supportEmail}`} className="text-brand underline">{siteConfig.supportEmail}</a></p>
                <p><strong className="text-ink">Address:</strong> {siteConfig.address}</p>
                <p><strong className="text-ink">Response Timeframe:</strong> We acknowledge requests within 48 hours and resolve within 7 business days.</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">7. Cookies, Local Storage & Security</h2>
              <p className="text-xs leading-relaxed">
                We use essential cookies and browser LocalStorage solely for maintaining session state, cart items, and preferences. We do not use third-party tracking cookies. We enforce HTTPS encryption, httpOnly session cookies for API uploads, and strict access controls. In case of a security breach involving personal data, we will notify affected users and the Data Protection Board within statutory deadlines.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-ink">8. Age Restriction (18+)</h2>
              <p className="text-xs">
                The face scan service and products are intended solely for individuals aged 18 or older. We do not knowingly collect or process personal data from minors.
              </p>
            </section>

            {/* Data Request Section */}
            <section id="your-rights" className="bg-skymist/40 p-6 rounded-3xl border border-ink/10 space-y-4 pt-6">
              <h2 className="font-display font-bold text-xl text-ink">
                9. Exercise Your Data Rights (DPDP Act)
              </h2>
              <p className="text-xs text-ink-muted">
                You have the right to access your data summary, request erasure, or withdraw consent at any time. Submit your request below:
              </p>
              <DataRequestForm />
            </section>

          </div>
        </div>

      </Container>
    </div>
  );
}
