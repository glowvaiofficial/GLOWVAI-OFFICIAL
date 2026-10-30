import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";

const DESC = "How to raise a complaint with GLOW VAI and what to expect: acknowledgement within 48 hours, resolution within one month.";

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/grievance` },
  openGraph: { title: "Grievance Redressal | GLOW VAI", description: DESC, url: `${SITE_URL}/grievance` },
};

export default function GrievancePage() {
  const mail = emailFor("grievance");
  const link = `underline underline-offset-4 rounded ${focusRing}`;
  return (
    <div className="bg-paper text-ink">
      <InfoHero
        id="grv-title"
        eyebrow="Grievance redressal"
        title="Not happy? Tell us."
        intro="If an order, a product or your data was not handled well, write to our grievance officer. This follows the Consumer Protection (E-Commerce) Rules, 2020."
      />
      <Section pad="tight">
        <RuledList
          items={[
            { title: "Grievance officer", body: <>Write to the email below. Your complaint goes straight to the founders.</> },
            { title: "Email", body: <a className={link} href={`mailto:${mail}`}>{mail}</a> },
            { title: "Phone and WhatsApp", body: <a className={link} href="tel:+918977855998">+91 89778 55998</a> },
            { title: "Address", body: <>Vijayawada, Andhra Pradesh, India</> },
          ]}
        />
      </Section>
      <Section tone="deep" pad="tight" labelledBy="grv-steps">
        <SectionTitle id="grv-steps">What happens next</SectionTitle>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
          {[
            { n: "01", t: "You write", b: "Send your order number, phone number and what went wrong." },
            { n: "02", t: "We acknowledge", b: "You get a reply within 48 hours." },
            { n: "03", t: "We resolve", b: "We aim to resolve within one month of your complaint." },
          ].map((s) => (
            <li key={s.n} className="border-t-2 border-ink pt-4">
              <p className="font-mono text-xs tracking-[0.12em] text-ink-muted">{s.n}</p>
              <h3 className="mt-3 font-display font-semibold text-2xl">{s.t}</h3>
              <p className="mt-2 text-ink-muted">{s.b}</p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
