import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";

const DESC = "Work with GLOW VAI in Andhra Pradesh: marketing and sales, operations and delivery, and engineering.";

export const metadata: Metadata = {
  title: "Careers",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/careers` },
  openGraph: { title: "Careers | GLOW VAI", description: DESC, url: `${SITE_URL}/careers` },
};

const areas = [
  { title: "Marketing, sales and revenue", href: "/careers/marketing-sales-revenue", body: "Grow the brand, run campaigns, work with partner stores and campus and auto partners." },
  { title: "Operations and delivery", href: "/careers/operations-delivery", body: "Run partner-store packing, riders and the 15-minute delivery promise." },
  { title: "Engineering and product", href: "/careers/engineering-product", body: "Build the face scan, the shop and the order system." },
  { title: "Customer care", href: "/careers/customer-care", body: "Help customers by WhatsApp and email, in English and Telugu." },
];

export default function CareersPage() {
  const mail = emailFor("careers");
  return (
    <div className="bg-paper text-ink">
      <InfoHero
        id="careers-title"
        eyebrow="Careers"
        title="Build GLOW VAI with us."
        intro="We are a small team in Andhra Pradesh. We have no open roles listed right now, but we read every application."
      />
      <Section pad="tight">
        <RuledList items={areas} />
      </Section>
      <Section tone="deep" pad="tight" labelledBy="apply-title">
        <SectionTitle id="apply-title">How to apply</SectionTitle>
        <p className="mt-4 text-ink-muted max-w-[56ch]">
          Email your CV and two lines about what you want to work on. Put the area in the subject line.
        </p>
        <a
          href={`mailto:${mail}?subject=Application`}
          className={`mt-6 inline-flex items-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}
        >
          {mail}
        </a>
      </Section>
    </div>
  );
}
