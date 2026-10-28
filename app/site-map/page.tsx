import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { Section, focusRing } from "@/components/home/shared";
import { InfoHero } from "@/components/pages/InfoPage";
import { footerLinks } from "@/config/nav";
import { careerAreas, helpTopics, partnerKinds } from "@/config/subpages";

const DESC = "Every page on GLOW VAI in one list.";

export const metadata: Metadata = {
  title: "Site Map",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/site-map` },
  openGraph: { title: "Site Map | GLOW VAI", description: DESC, url: `${SITE_URL}/site-map` },
};

export default function SiteMapPage() {
  const groups = [
    { title: "Shop", links: footerLinks.shop },
    { title: "Company", links: [...footerLinks.company, ...careerAreas.map((c) => ({ title: c.title, href: `/careers/${c.slug}` })), { title: "Brand kit", href: "/press/brand-kit" }] },
    { title: "Help", links: [...footerLinks.help, ...helpTopics.map((h) => ({ title: h.title, href: `/help/${h.slug}` }))] },
    { title: "Partners", links: [...footerLinks.partners, ...partnerKinds.map((p) => ({ title: p.title, href: `/partners/${p.slug}` }))] },
    { title: "Policies", links: footerLinks.legal },
  ];
  return (
    <div className="bg-paper text-ink">
      <InfoHero id="map-title" eyebrow="Site map" title="Every page, one list." intro="Find anything on GLOW VAI from here." />
      <Section pad="tight">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10 border-t border-ink/20 pt-8">
          {groups.map((g) => {
            const seen = new Set<string>();
            return (
              <nav key={g.title} aria-label={g.title}>
                <h2 className="font-display font-semibold text-2xl">{g.title}</h2>
                <ul className="mt-3 space-y-1">
                  {g.links
                    .filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)))
                    .map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className={`inline-flex items-center min-h-11 text-ink-muted hover:text-brand underline underline-offset-4 decoration-ink/20 rounded ${focusRing}`}>
                          {l.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </nav>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
