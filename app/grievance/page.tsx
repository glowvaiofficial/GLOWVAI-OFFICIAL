import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Clock, FileText, CheckCircle2, AlertTriangle, Mail, Phone, MapPin } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { emailFor } from "@/config/emails";

const DESC =
  "Official Statutory Grievance Redressal Mechanism for GLOW VAI in compliance with the Consumer Protection (E-Commerce) Rules, 2020 and DPDP Act, 2023.";

export const metadata: Metadata = {
  title: "Grievance Redressal Officer | GLOW VAI",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/grievance` },
  openGraph: {
    title: "Grievance Redressal Officer | GLOW VAI",
    description: DESC,
    url: `${SITE_URL}/grievance`,
  },
};

export default function GrievancePage() {
  const mail = emailFor("grievance");

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="md" labelledBy="grv-title">
        <div className="max-w-[760px]">
          <Eyebrow>Consumer Protection & Compliance</Eyebrow>
          <h1
            id="grv-title"
            className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
          >
            Statutory <span className="text-brand">Grievance Redressal.</span>
          </h1>
          <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted">
            In compliance with the Consumer Protection (E-Commerce) Rules, 2020 and the Digital Personal Data Protection (DPDP) Act, 2023, GLOW VAI maintains an independent, dedicated grievance redressal mechanism for consumer disputes, order issues, and personal data concerns.
          </p>
        </div>
      </Section>

      {/* Grievance Officer Profile */}
      <Section tone="deep" pad="tight" labelledBy="officer-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h2 id="officer-title" className="font-display font-semibold text-2xl text-ink">
                  Designated Grievance Officer
                </h2>
                <p className="text-xs text-ink-muted font-mono uppercase tracking-wider">Statutory Appointment</p>
              </div>
            </div>

            <p className="text-sm text-ink-muted leading-relaxed">
              The designated Grievance Officer is responsible for addressing consumer grievances, delivery disputes, transit damages, and personal data access/erasure requests. All complaints are routed directly to executive leadership.
            </p>

            <dl className="divide-y divide-ink/10 border-t border-ink/10 text-sm">
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Officer Name</dt>
                <dd className="font-semibold text-ink">SK Sardar Musthafa</dd>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Designation</dt>
                <dd className="font-medium text-ink">Grievance Officer & Co-Founder</dd>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Official Email</dt>
                <dd>
                  <a href={`mailto:${mail}`} className="font-semibold text-brand underline underline-offset-4">
                    {mail}
                  </a>
                </dd>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Direct Phone / WhatsApp</dt>
                <dd>
                  <a href="tel:+918977855998" className="font-semibold text-ink underline underline-offset-4">
                    +91 89778 55998
                  </a>
                </dd>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Physical Address</dt>
                <dd className="text-ink">GLOW VAI Retail, Vijayawada, Andhra Pradesh, 520001, India</dd>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">Operating Hours</dt>
                <dd className="text-ink">Monday – Saturday: 10:00 AM – 6:00 PM IST</dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 space-y-5 shadow-2xs">
            <h3 className="font-display font-semibold text-xl text-ink">Statutory Timelines</h3>
            <p className="text-sm text-ink-muted">
              Under Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020:
            </p>

            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-ink">Acknowledgment: Within 48 Hours</p>
                  <p className="text-xs text-ink-muted mt-0.5">Every formal complaint receives a ticket reference number within 48 hours.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B5C3B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-ink">Resolution: Maximum 30 Days</p>
                  <p className="text-xs text-ink-muted mt-0.5">Most inquiries are resolved within 2 to 4 working days; statutory maximum is 30 days.</p>
                </div>
              </li>
            </ul>

            <div className="pt-4 border-t border-ink/10">
              <a
                href={`mailto:${mail}?subject=Formal Grievance Submission`}
                className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-ink text-white font-semibold text-sm hover:bg-brand transition-colors ${focusRing}`}
              >
                <span>Submit Grievance to Officer</span>
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* 3-Tier Escalation Matrix */}
      <Section pad="md" labelledBy="matrix-title">
        <Eyebrow>Dispute Resolution</Eyebrow>
        <SectionTitle id="matrix-title" className="mt-2">3-Tier Escalation Matrix</SectionTitle>
        <p className="mt-3 text-ink-muted max-w-xl">
          Follow our transparent step-by-step resolution flow to ensure your complaint is handled promptly.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold px-2.5 py-1 rounded-[6px] bg-brand/10">
              Level 1
            </span>
            <h3 className="font-display font-semibold text-xl text-ink">Frontline Support</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              For common delivery delays, missing items, or product questions, contact our support desk via WhatsApp or email:
            </p>
            <p className="font-semibold text-sm text-ink pt-1">support@glowvai.in</p>
            <p className="text-xs text-ink-light">Typical response: 1 to 3 hours</p>
          </div>

          <div className="bg-white border-2 border-brand/40 rounded-[20px] p-6 shadow-xs space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold px-2.5 py-1 rounded-[6px] bg-brand/10">
              Level 2 (Statutory)
            </span>
            <h3 className="font-display font-semibold text-xl text-ink">Grievance Redressal Officer</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              If your issue is unresolved after 48 hours or relates to personal data/DPDP rights, escalate to the Grievance Officer:
            </p>
            <p className="font-semibold text-sm text-brand pt-1">grievance@glowvai.in</p>
            <p className="text-xs text-ink-light">Acknowledgment in 48 hrs &middot; Full resolution in 15 days</p>
          </div>

          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-light font-semibold px-2.5 py-1 rounded-[6px] bg-paper-deep">
              Level 3 (External)
            </span>
            <h3 className="font-display font-semibold text-xl text-ink">Regulatory Authorities</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              If you remain unsatisfied after Level 2, consumers retain the right to lodge a complaint via the National Consumer Helpline:
            </p>
            <p className="font-semibold text-sm text-ink pt-1">consumerhelpline.gov.in</p>
            <p className="text-xs text-ink-light">Toll-free NCH Helpline: 1915</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
