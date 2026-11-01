import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { Section, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";

const DESC = "How GLOW VAI works to keep the site usable for everyone, and how to tell us about a problem.";

export const metadata: Metadata = {
  title: "Accessibility",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/accessibility` },
  openGraph: { title: "Accessibility | GLOW VAI", description: DESC, url: `${SITE_URL}/accessibility` },
};

export default function AccessibilityPage() {
  const mail = emailFor("contact");
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="a11y-title" eyebrow="Accessibility" title="A site everyone can use." intro="We aim for WCAG 2.2 level AA. If something does not work for you, tell us and we will fix it." />
      <Section pad="tight">
        <RuledList
          items={[
            { title: "Keyboard", body: "Every link, button and form can be used without a mouse, and focus is always visible." },
            { title: "Screen readers", body: "Pages use headings, labels and landmarks. Images that matter have descriptions." },
            { title: "Colour and contrast", body: "Text meets AA contrast. Meaning is never shown by colour alone." },
            { title: "Motion", body: "If your device asks for reduced motion, animations stop." },
            { title: "Tell us about a problem", body: <a className={`underline underline-offset-4 rounded ${focusRing}`} href={`mailto:${mail}?subject=Accessibility`}>{mail}</a> },
            { title: "Automated checks", body: "Our latest automated audit scored 100 for accessibility on most pages. Automated checks do not find everything." },
          ]}
        />
      </Section>
    </div>
  );
}
