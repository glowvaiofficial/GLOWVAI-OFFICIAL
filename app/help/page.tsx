import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero, RuledList } from "@/components/pages/InfoPage";
import { departmentEmails } from "@/config/emails";

const DESC = "Help for GLOW VAI orders, delivery, returns, privacy and complaints, with the right email for each team.";

export const metadata: Metadata = {
  title: "Help Center",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/help` },
  openGraph: { title: "Help Center | GLOW VAI", description: DESC, url: `${SITE_URL}/help` },
};

const topics = [
  { title: "Track an order", href: "/track-order", body: "Check where your order is." },
  { title: "Delivery", href: "/delivery", body: "How the 15-minute estimate works and what can slow it." },
  { title: "Returns and refunds", href: "/returns", body: "What you can return and how long refunds take." },
  { title: "Questions and answers", href: "/faq", body: "Short answers about the scan, orders and privacy." },
  { title: "Your data", href: "/privacy", body: "Ask us to show or delete your data." },
  { title: "Make a complaint", href: "/grievance", body: "How to reach the grievance officer and what to expect." },
];

export default function HelpPage() {
  const link = `underline underline-offset-4 rounded ${focusRing}`;
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="help-title" eyebrow="Help center" title="How can we help?" intro="Pick a topic, or write to the team that handles it. We reply on working days." />
      <Section pad="tight">
        <RuledList items={topics} />
      </Section>
      <Section tone="deep" labelledBy="mail-title" pad="tight">
        <SectionTitle id="mail-title">Who to write to</SectionTitle>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left border-t border-ink/20">
            <caption className="sr-only">GLOW VAI department email addresses</caption>
            <thead>
              <tr className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                <th scope="col" className="py-3 pr-4 font-normal">Team</th>
                <th scope="col" className="py-3 pr-4 font-normal">Email</th>
                <th scope="col" className="py-3 font-normal">Write about</th>
              </tr>
            </thead>
            <tbody>
              {departmentEmails.map((d) => (
                <tr key={d.key} className="border-t border-ink/20 align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold">{d.label}</th>
                  <td className="py-3 pr-4">
                    <a href={`mailto:${d.email}`} className={link}>{d.email}</a>
                  </td>
                  <td className="py-3 text-ink-muted">{d.for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-ink-muted">
          Faster on WhatsApp: <a href="https://wa.me/918977855998" className={link}>+91 89778 55998</a>. Or use the{" "}
          <Link href="/contact" className={link}>contact form</Link>.
        </p>
      </Section>
    </div>
  );
}
