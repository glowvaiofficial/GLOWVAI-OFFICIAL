import type { Metadata } from "next";
import { DocPage, DocSection } from "@/components/pages/DocPage";
import { AFFILIATE_CONFIG } from "@/lib/shop/affiliate/config";
import { SITE_URL } from "@/lib/site-url";

// Draft: not indexed until the legal review is done. Every statement here comes from the code (affiliate rules, window,
// link format, data kept). No rates and no legal entity details are stated, because none are set in the codebase.
export const metadata: Metadata = {
  title: "Affiliate terms (draft)",
  description: "Draft affiliate terms for the GlowVai affiliate programme. Pending legal review before publication.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/affiliate/terms` },
};

const sections = [
  { id: "eligibility", title: "1. Who can apply" },
  { id: "link", title: "2. Your link" },
  { id: "attribution", title: "3. How orders are attributed" },
  { id: "commission", title: "4. Commission and payouts" },
  { id: "rules", title: "5. Promotion rules" },
  { id: "data", title: "6. Data we keep" },
  { id: "status", title: "7. Pausing and ending" },
  { id: "changes", title: "8. Changes to these terms" },
];

export default function AffiliateTermsPage() {
  return (
    <DocPage id="affiliate-terms-title" eyebrow="Affiliate terms" title="GlowVai affiliate terms" updated="Not yet published" draft sections={sections}>
      <p className="mb-8 rounded-[10px] border border-ink/25 bg-white p-4 font-medium">Draft — pending legal review before publication.</p>
      <DocSection id="eligibility" title="1. Who can apply">
        <p>You need a verified email on your account, or an account that has existed for {AFFILIATE_CONFIG.minAccountAgeDays} days. You may hold one open application at a time. If an application is not approved you may apply again.</p>
      </DocSection>
      <DocSection id="link" title="2. Your link">
        <p>An approved affiliate has one link, in the form {AFFILIATE_CONFIG.linkBase}CODE. Short links are not accepted for the channel you share on.</p>
      </DocSection>
      <DocSection id="attribution" title="3. How orders are attributed">
        <p>An order is attributed to you when the buyer clicked your link within {AFFILIATE_CONFIG.attributionWindowDays} days before placing it, counted from their first click. If several affiliates&apos; links were clicked in that window, the most recent click counts. An order placed by your own account is never attributed to you. Cancelled orders are not counted on your dashboard.</p>
      </DocSection>
      <DocSection id="commission" title="4. Commission and payouts">
        <p>Commission rates are set by GlowVai and are shown on your dashboard once they are confirmed. Payouts are not yet set up; when they are, they will appear on your dashboard.</p>
      </DocSection>
      <DocSection id="rules" title="5. Promotion rules">
        <p>When you share your link you must say that you are a GlowVai affiliate. You must not make medical claims or promise results for any product, send spam, use misleading ads, or bid on GlowVai brand names. You must not use your own link to buy from GlowVai.</p>
      </DocSection>
      <DocSection id="data" title="6. Data we keep">
        <p>We count clicks per link per day. We do not store IP addresses. For each visitor we keep only a hashed form of a random visitor id, so that one visitor counts once per link per day. Dashboards show counts and totals, not customer names or contact details.</p>
      </DocSection>
      <DocSection id="status" title="7. Pausing and ending">
        <p>GlowVai may pause or end an affiliate account, and switch its link off, if these terms are broken. The reason is recorded. While paused, orders through the link are not attributed.</p>
      </DocSection>
      <DocSection id="changes" title="8. Changes to these terms">
        <p>The rules you accept on the application form carry a version. A change to the rules means a new version, and you will be asked to accept it.</p>
      </DocSection>
    </DocPage>
  );
}
