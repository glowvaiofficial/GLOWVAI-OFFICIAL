import React from "react";
import type { Metadata } from "next";
import { siteConfig, BRAND_NAME } from "@/config/site";
import { DataRequestForm } from "@/components/privacy/DataRequestForm";
import { DocPage, DocSection, DocList } from "@/components/pages/DocPage";
import { focusRing } from "@/components/home/shared";
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

const sections = [
  { id: "fiduciary", title: "1. Data fiduciary and identity" },
  { id: "collect", title: "2. What personal data we collect" },
  { id: "photos", title: "3. Photo processing and optional storage" },
  { id: "processors", title: "4. Third-party data processors" },
  { id: "retention", title: "5. Data retention schedule" },
  { id: "grievance", title: "6. Grievance redressal officer" },
  { id: "cookies", title: "7. Cookies, local storage and security" },
  { id: "age", title: "8. Age restriction (18+)" },
  { id: "your-rights", title: "9. Exercise your data rights" },
];

const link = `text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`;

export default function PrivacyPage() {
  return (
    <DocPage
      id="privacy-title"
      eyebrow="Privacy policy"
      title="Privacy policy."
      updated="October 2026"
      draft={!siteConfig.LEGAL_APPROVED}
      sections={sections}
    >
      <DocSection id="fiduciary" title={sections[0].title}>
        <p>
          {siteConfig.legalName} (&ldquo;{BRAND_NAME}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this platform. For the purpose of India&apos;s Digital Personal Data Protection (DPDP) Act, 2023, we act as the Data Fiduciary responsible for determining the purpose and means of personal data processing.
        </p>
      </DocSection>

      <DocSection id="collect" title={sections[1].title}>
        <p>When you use our website or face analysis tool, we collect the following categories of data:</p>
        <DocList
          items={[
            <><strong className="font-semibold text-ink">Contact details:</strong> full name, phone number, and optional email address.</>,
            <><strong className="font-semibold text-ink">Technical identifiers:</strong> IP address, browser type, operating system, referrer URL, and UTM parameters.</>,
            <><strong className="font-semibold text-ink">Location data:</strong> coarse geographic region (city and state) derived from IP lookup.</>,
            <><strong className="font-semibold text-ink">Consent records:</strong> timestamp, consent version ID, and opt-in choices.</>,
            <><strong className="font-semibold text-ink">Skin assessment scores:</strong> hydration, texture, tone, and clarity numerical scores generated during scans.</>,
          ]}
        />
      </DocSection>

      <DocSection id="photos" title={sections[2].title}>
        <p>
          Your photo is analysed on your phone inside your browser. If and only if you check the separate optional image consent box, your image is saved to secure private cloud storage for quality review and report generation. We delete stored photos after 90 days, or sooner upon request. Who can access stored face images: authorised internal systems engineers only.
        </p>
      </DocSection>

      <DocSection id="processors" title={sections[3].title}>
        <p>We share personal data with vetted service providers acting as Data Processors strictly to provide our services:</p>
        <DocList
          items={[
            <><strong className="font-semibold text-ink">Hosting and infrastructure:</strong> Vercel Inc. (web hosting and static distribution).</>,
            <><strong className="font-semibold text-ink">Storage and data logging:</strong> secure encrypted cloud storage (for lead records and optional photo backup).</>,
            <><strong className="font-semibold text-ink">Cross-border transfers:</strong> data stored on cloud servers may involve processing outside India subject to standard security safeguards.</>,
          ]}
        />
      </DocSection>

      <DocSection id="retention" title={sections[4].title}>
        <DocList
          items={[
            <><strong className="font-semibold text-ink">Face images (with consent):</strong> automatically purged after 90 days.</>,
            <><strong className="font-semibold text-ink">Lead and contact details:</strong> retained for up to 24 months from last interaction or until consent is withdrawn.</>,
            <><strong className="font-semibold text-ink">Newsletter and marketing list:</strong> retained until you click unsubscribe or request deletion.</>,
          ]}
        />
      </DocSection>

      <DocSection id="grievance" title={sections[5].title}>
        <p>In compliance with the DPDP Act 2023, you may address data protection concerns or grievances to our designated Data Protection Officer:</p>
        <dl className="border-t border-ink/15">
          {[
            ["Name", "Grievance Officer, GLOW VAI Technologies"],
            ["Email", <a key="e" href={`mailto:${siteConfig.supportEmail}`} className={link}>{siteConfig.supportEmail}</a>],
            ["Address", siteConfig.address],
            ["Response timeframe", "We acknowledge requests within 48 hours and resolve within 7 business days."],
          ].map(([k, v]) => (
            <div key={String(k)} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-6 border-b border-ink/15">
              <dt className="py-3 font-semibold text-ink">{k}</dt>
              <dd className="py-3">{v}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection id="cookies" title={sections[6].title}>
        <p>
          We use essential cookies and browser LocalStorage solely for maintaining session state, cart items, and preferences. We do not use third-party tracking cookies. We enforce HTTPS encryption, httpOnly session cookies for API uploads, and strict access controls. In case of a security breach involving personal data, we will notify affected users and the Data Protection Board within statutory deadlines.
        </p>
      </DocSection>

      <DocSection id="age" title={sections[7].title}>
        <p>The face scan service and products are intended solely for individuals aged 18 or older. We do not knowingly collect or process personal data from minors.</p>
      </DocSection>

      <DocSection id="your-rights" title={sections[8].title}>
        <p>You have the right to access your data summary, request erasure, or withdraw consent at any time. Submit your request below:</p>
        <DataRequestForm />
      </DocSection>
    </DocPage>
  );
}
