import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/home/shared";
import { AffiliateApplyForm } from "@/components/affiliate/AffiliateApplyForm";

export const metadata: Metadata = {
  title: "Apply to the affiliate programme",
  description: "Apply to the GlowVai affiliate programme.",
  robots: { index: false, follow: false },
};

export default function AffiliateApplyPage() {
  return (
    <div className="bg-paper text-ink">
      <Section pad="tight" labelledBy="apply-title">
        <Eyebrow>Affiliate application</Eyebrow>
        <h1 id="apply-title" className="mt-4 font-display text-[clamp(2.25rem,1.5rem+3.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
          Apply to the programme
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink-light">We review each application. You will see the status on your dashboard.</p>
        <div className="mt-10 max-w-[640px]">
          <AffiliateApplyForm />
        </div>
      </Section>
    </div>
  );
}
