import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/home/shared";
import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";

export const metadata: Metadata = {
  title: "Affiliate dashboard",
  description: "Your GlowVai affiliate link, clicks and attributed orders.",
  robots: { index: false, follow: false },
};

export default function AffiliateDashboardPage() {
  return (
    <div className="bg-paper text-ink">
      <Section pad="tight" labelledBy="dash-title">
        <Eyebrow>Affiliate dashboard</Eyebrow>
        <h1 id="dash-title" className="mt-4 font-display text-[clamp(2.25rem,1.5rem+3.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
          Your affiliate account
        </h1>
        <div className="mt-10 max-w-[880px]">
          <AffiliateDashboard />
        </div>
      </Section>
    </div>
  );
}
