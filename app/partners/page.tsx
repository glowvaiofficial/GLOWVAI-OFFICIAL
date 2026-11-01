import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";

const DESC = "Partner with GLOW VAI as a store, a brand, a rider, an auto driver or a campus ambassador.";

export const metadata: Metadata = {
  title: "Partner With Us",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/partners` },
  openGraph: { title: "Partner With Us | GLOW VAI", description: DESC, url: `${SITE_URL}/partners` },
};

export default function PartnersPage() {
  const mail = emailFor("partners");
  const link = `underline underline-offset-4 rounded ${focusRing}`;
  const items = [
    {
      title: "Partner stores", href: "/partners/stores",
      body: (
        <>
          Pack and hand over orders near customers. Write to{" "}
          <a className={link} href={`mailto:${mail}?subject=Partner store`}>{mail}</a>. See{" "}
          <Link className={link} href="/partners/stores">what we look for</Link>.
        </>
      ),
    },
    {
      title: "Brands and suppliers", href: "/partners/brands",
      body: (
        <>
          Want your products stocked? Send your catalogue and licences to{" "}
          <a className={link} href={`mailto:${mail}?subject=Brand listing`}>{mail}</a>.
        </>
      ),
    },
    {
      title: "Riders", href: "/partners/rider",
      body: (
        <>
          Deliver in your area. Write to <a className={link} href={`mailto:${mail}?subject=Rider`}>{mail}</a> with your area and vehicle.
        </>
      ),
    },
    {
      title: "Auto drivers and campus ambassadors",
      body: (
        <>
          Earn by sharing the free scan. <Link className={link} href="/referral">Join the referral program</Link>.
        </>
      ),
    },
  ];
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="partners-title" eyebrow="Partners" title="Grow with GLOW VAI." intro="Pick the way you want to work with us. We reply on working days." />
      <Section pad="tight">
        <RuledList items={items} />
      </Section>
      <Section tone="deep" pad="tight" labelledBy="partner-note">
        <SectionTitle id="partner-note">What we look for</SectionTitle>
        <p className="mt-4 text-ink-muted max-w-[60ch]">
          Genuine stock with valid invoices, clear labels, and a willingness to follow our packing and privacy rules.
        </p>
      </Section>
    </div>
  );
}
