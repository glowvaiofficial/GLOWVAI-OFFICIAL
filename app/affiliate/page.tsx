import type { Metadata } from "next";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { COMMISSION_LINE } from "@/lib/shop/affiliate/projection";
import { AFFILIATE_CONFIG } from "@/lib/shop/affiliate/config";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "GlowVai Affiliate programme",
  description: "Share GlowVai with your audience. Get your own link, see your clicks and attributed orders, and track your status.",
  alternates: { canonical: `${SITE_URL}/affiliate` },
};

const steps = [
  { title: "Apply", body: "Tell us your display name, where you share, your audience size range and the categories you cover. Accept the affiliate rules." },
  { title: "Get your link", body: "Once approved, you get one link to share. It opens the GlowVai shop with your code." },
  { title: "Track it", body: "Your dashboard shows clicks, the orders placed through your link, and your status." },
];

export default function AffiliatePage() {
  return (
    <div className="bg-paper text-ink">
      <Section pad="tight" labelledBy="affiliate-title">
        <Eyebrow>GlowVai Affiliate</Eyebrow>
        <h1 id="affiliate-title" className="mt-4 font-display text-[clamp(2.5rem,1.6rem+4.5vw,4.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
          Share GlowVai with your audience
        </h1>
        <p className="mt-5 max-w-[62ch] text-[17px] text-ink-light">
          If you already share skincare, haircare, makeup, fragrance, bath and body or wellness with your followers, you can apply for an affiliate link.
          A customer who buys within {AFFILIATE_CONFIG.attributionWindowDays} days of clicking your link is attributed to you.
        </p>
        <p className="mt-3 max-w-[62ch] text-[15px] text-ink-muted">{COMMISSION_LINE}.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/affiliate/apply" className={`inline-flex items-center rounded-full bg-ink px-6 py-3 font-medium text-paper ${focusRing}`}>
            Apply to the programme
          </Link>
          <Link href="/affiliate/dashboard" className={`inline-flex items-center rounded-full border border-ink px-6 py-3 font-medium ${focusRing}`}>
            Your dashboard
          </Link>
        </div>
      </Section>

      <Section pad="tight" labelledBy="how-title">
        <h2 id="how-title" className="font-display text-3xl font-semibold">How it works</h2>
        <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-[14px] border border-ink/15 bg-white p-6">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">Step {i + 1}</p>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] text-ink-light">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section pad="tight" labelledBy="rules-title">
        <h2 id="rules-title" className="font-display text-3xl font-semibold">Before you apply</h2>
        <ul className="mt-6 list-disc space-y-2 pl-6 text-[16px] text-ink-light">
          <li>Use a verified email on your account, or an account that has existed for {AFFILIATE_CONFIG.minAccountAgeDays} days.</li>
          <li>One open application at a time. Channel links must be full https:// addresses; short links are not accepted.</li>
          <li>Disclose that you are a GlowVai affiliate, and make no medical claims or promises of results.</li>
        </ul>
        <p className="mt-6 text-[15px]">
          Read the full <Link href="/affiliate/terms" className={`underline underline-offset-4 rounded ${focusRing}`}>affiliate terms</Link>.
        </p>
      </Section>
    </div>
  );
}
