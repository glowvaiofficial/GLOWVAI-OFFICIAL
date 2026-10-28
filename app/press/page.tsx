import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";
import { entityConfig } from "@/config/entity";

const DESC = "Press and media enquiries for GLOW VAI, with brand facts and a media contact.";

export const metadata: Metadata = {
  title: "Press and Media",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/press` },
  openGraph: { title: "Press and Media | GLOW VAI", description: DESC, url: `${SITE_URL}/press` },
};

export default function PressPage() {
  const mail = emailFor("press");
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="press-title" eyebrow="Press" title="For journalists and creators." intro={entityConfig.brand.description} />
      <Section pad="tight">
        <RuledList
          items={[
            {
              title: "Media contact",
              body: (
                <a className={`underline underline-offset-4 rounded ${focusRing}`} href={`mailto:${mail}`}>
                  {mail}
                </a>
              ),
            },
            { title: "Based in", body: "Andhra Pradesh, India" },
            { title: "What we do", body: "Free face scan, skincare retail and delivery by rider in Vijayawada." },
            { title: "Coverage", body: "No press coverage is listed yet." },
          ]}
        />
      </Section>
      <Section tone="deep" pad="tight" labelledBy="press-kit">
        <SectionTitle id="press-kit">Need a quote or a photo?</SectionTitle>
        <p className="mt-4 text-ink-muted max-w-[56ch]">Write to us with your deadline. We reply on working days.</p>
      </Section>
    </div>
  );
}
