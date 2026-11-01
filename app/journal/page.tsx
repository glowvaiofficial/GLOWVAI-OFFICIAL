import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";
import { journalArticles } from "@/config/journal";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { getAssetPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Skincare Basics & Routine Guides",
  description: "Plain-language skincare guides on ingredients, routines, and skin health from the GLOW VAI team in India.",
  robots: {
    index: journalArticles.filter((a) => a.status === "published").length >= 3,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_URL}/journal`,
  },
  openGraph: {
    title: "GLOW VAI Journal | Skincare Basics & Routine Guides",
    description: "Plain-language skincare guides on ingredients, routines, and skin health from the GLOW VAI team in India.",
    url: `${SITE_URL}/journal`,
  },
};

export default function JournalPage() {
  const publishedArticles = journalArticles.filter((a) => a.status === "published");
  const upcomingArticles = journalArticles.filter((a) => a.status === "draft");

  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema(
      "/journal",
      "GLOW VAI Journal | Skincare Basics & Routine Guides",
      "Plain-language skincare guides on ingredients, routines, and skin health from the GLOW VAI team in India."
    ),
  };

  return (
    <div className="bg-paper text-ink">
      <JsonLd data={pageSchema} />

      <Section pad="md" labelledBy="journal-title">
        <Eyebrow>GLOW VAI journal</Eyebrow>
        <h1 id="journal-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[18ch]">
          Skin basics, written plainly.
        </h1>
        <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[52ch]">
          Practical breakdowns of ingredient lists, active percentages and simple daily routines for Indian weather.
        </p>
      </Section>

      <Section pad="tight" labelledBy="published-title">
        <div className="flex items-baseline justify-between border-b border-ink/20 pb-4">
          <SectionTitle id="published-title" className="text-[clamp(1.5rem,1.2rem+1.2vw,2rem)]">Guides</SectionTitle>
          <p className="text-[15px] text-ink-muted">{publishedArticles.length} available</p>
        </div>

        <ul className="divide-y divide-ink/20">
          {publishedArticles.map((article) => (
            <li key={article.id} className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 items-center">
              <div className="lg:col-span-4 relative aspect-[16/10] w-full rounded-[16px] overflow-hidden bg-paper-deep border border-ink/15 shadow-2xs">
                <Image
                  src={getAssetPath(article.imageSlot || "/images/hero/skincare-studio-hero.jpg")}
                  alt={article.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.12em] text-brand mb-2">
                  <span>{article.category}</span>
                  <span>&middot;</span>
                  <span className="text-ink-muted">{article.readTime}</span>
                </div>
                <h2 className="font-display font-semibold text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] leading-tight">
                  <Link href={`/journal/${article.slug}`} className={`underline-offset-4 hover:underline rounded ${focusRing}`}>
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2.5 text-[16px] leading-relaxed text-ink-muted max-w-[62ch]">{article.excerpt}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[14px] text-ink-light">
                    By {article.author.name}, {article.author.role}
                  </p>
                  <Link
                    href={`/journal/${article.slug}`}
                    className={`inline-flex items-center min-h-[40px] font-semibold text-brand underline underline-offset-4 decoration-brand/30 hover:decoration-brand rounded ${focusRing}`}
                  >
                    Read the guide &rarr;
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {upcomingArticles.length > 0 && (
        <Section tone="deep" pad="tight" labelledBy="upcoming-title">
          <SectionTitle id="upcoming-title">Coming soon</SectionTitle>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {upcomingArticles.map((article) => (
              <li key={article.id} className="bg-white border border-ink/15 rounded-[24px] p-6 space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">{article.category}</p>
                <h3 className="font-display font-semibold text-xl leading-snug">{article.title}</h3>
                <p className="text-[15px] text-ink-muted leading-relaxed">{article.excerpt}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section pad="tight" labelledBy="journal-cta">
        <div className="bg-white border border-ink/15 rounded-[24px] p-8 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 id="journal-cta" className="font-display font-semibold text-2xl sm:text-3xl">Find your routine in 30 seconds.</h2>
            <p className="mt-2 text-ink-muted max-w-[52ch]">Take the free face scan and see which products match your results. Photos are stored privately.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/face-analysis" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}>
              Scan my face, free
            </Link>
            <Link href="/shop" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
              Browse the shop
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
