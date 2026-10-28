import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { Section, SectionTitle, focusRing } from "@/components/home/shared";
import { InfoHero } from "@/components/pages/InfoPage";
import { emailFor } from "@/config/emails";

const DESC = "GLOW VAI logo files, colours and fonts for press and partners.";

export const metadata: Metadata = {
  title: "Brand Kit",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/press/brand-kit` },
  openGraph: { title: "Brand Kit | GLOW VAI", description: DESC, url: `${SITE_URL}/press/brand-kit` },
};

const colours = [
  { name: "Brand blue", hex: "#1447E6" },
  { name: "Ink", hex: "#12161F" },
  { name: "Paper", hex: "#F6F3EE" },
  { name: "Paper deep", hex: "#ECE7DF" },
];

export default function BrandKitPage() {
  const link = `underline underline-offset-4 rounded ${focusRing}`;
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="kit-title" eyebrow="Press" title="Brand kit." intro="Use these files when you write about GLOW VAI. Please do not change the logo colours or shape." />
      <Section pad="tight">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 border-t border-ink/20 pt-8">
          <div>
            <h2 className="font-display font-semibold text-2xl">Logo</h2>
            <div className="mt-4 relative h-40 rounded-[10px] bg-white border border-ink/15">
              <Image src="/logo/glowvai-logo-512.png" alt="GLOW VAI logo" fill sizes="400px" className="object-contain p-6" />
            </div>
            <p className="mt-4 flex gap-6">
              <a className={link} href="/logo/glowvai-logo.svg" download>Download SVG</a>
              <a className={link} href="/logo/glowvai-logo-512.png" download>Download PNG</a>
            </p>
          </div>
          <div>
            <h2 className="font-display font-semibold text-2xl">Colours</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {colours.map((c) => (
                <li key={c.hex} className="border border-ink/15 rounded-[10px] overflow-hidden bg-white">
                  <div className="h-16" style={{ backgroundColor: c.hex }} />
                  <p className="p-3 text-sm">
                    <span className="font-semibold">{c.name}</span>
                    <br />
                    <span className="font-mono text-ink-muted">{c.hex}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <Section tone="deep" pad="tight" labelledBy="kit-type">
        <SectionTitle id="kit-type">Fonts and contact</SectionTitle>
        <p className="mt-4 text-ink-muted max-w-[60ch]">
          Headings use Familjen Grotesk. Body text uses Inter. Both are free under the SIL Open Font License.
        </p>
        <p className="mt-4 text-ink-muted">
          Questions: <a className={link} href={`mailto:${emailFor("press")}`}>{emailFor("press")}</a>.{" "}
          <Link href="/press" className={link}>Back to press</Link>
        </p>
      </Section>
    </div>
  );
}
