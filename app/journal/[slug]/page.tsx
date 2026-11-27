import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { journalArticles } from "@/config/journal";
import { ORG_ID, WEBSITE_ID } from "@/lib/seo/entity-graph";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { getAssetPath } from "@/lib/utils";
import Image from "next/image";
import { JournalCover } from "@/components/journal/JournalCover";
import { renderInline, stripInline } from "@/lib/journal-text";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return journalArticles
    .filter((a) => a.status === "published")
    .map((article) => ({
      slug: article.slug,
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = journalArticles.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  const fullUrl = `${SITE_URL}/journal/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GLOW VAI skincare" }],
      title: article.title,
      description: article.description,
      url: fullUrl,
      type: "article",
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
      authors: [article.author.name],
    },
  };
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = journalArticles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const fullUrl = `${SITE_URL}/journal/${article.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${fullUrl}#article`,
    "isPartOf": { "@id": WEBSITE_ID },
    "headline": article.title,
    "description": article.description,
    "inLanguage": "en-IN",
    "mainEntityOfPage": fullUrl,
    "datePublished": article.datePublished,
    "dateModified": article.dateModified,
    "author": article.author.name === "GLOW VAI Editorial Team"
      ? { "@id": ORG_ID }
      : { "@type": "Person", "name": article.author.name, "jobTitle": article.author.role },
    "publisher": { "@id": ORG_ID },
    ...(article.keywords?.length ? { "keywords": article.keywords.join(", ") } : {}),
    ...(article.sources?.length ? { "citation": article.sources.map((x) => x.url) } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Journal", "item": `${SITE_URL}/journal` },
      { "@type": "ListItem", "position": 3, "name": article.title, "item": fullUrl },
    ],
  };

  const faqSchema = article.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": article.faq.map((f) => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": stripInline(f.a) },
        })),
      }
    : null;

  const related = (article.related ?? [])
    .map((slugName) => journalArticles.find((a) => a.slug === slugName && a.status === "published"))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const link = `gv-link-inline underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`;

  return (
    <article className="bg-paper text-ink">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema ? <JsonLd data={faqSchema} /> : null}

      <Section pad="tight" labelledBy="article-title">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className={link}>Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/journal" className={link}>Journal</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">{article.category}</li>
          </ol>
        </nav>

        <div className="max-w-[68ch] mx-auto">
          <Eyebrow>{article.category} · {article.readTime}</Eyebrow>
          <h1 id="article-title" className="mt-4 font-display font-semibold text-[clamp(2.25rem,1.5rem+3.8vw,4rem)] leading-[1.02] tracking-[-0.03em]">
            {article.title}
          </h1>
          <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted">{article.description}</p>
          <p className="mt-6 pb-6 border-b border-ink/20 text-[15px] text-ink-muted">
            By <span className="font-semibold text-ink">{article.author.name}</span>, {article.author.role}. Published {article.datePublished}, updated {article.dateModified}.
          </p>

          <div className="mt-8 relative aspect-[16/9] w-full rounded-[20px] overflow-hidden border border-ink/15 shadow-2xs">
            <JournalCover article={article} priority sizes="(max-width: 768px) 100vw, 680px" />
          </div>
        </div>

        <div className="max-w-[68ch] mx-auto mt-8 border border-ink/15 bg-white rounded-[10px] p-5 text-[15px] text-ink-muted">
          <p className="font-semibold text-ink">Cosmetic insights, not medical advice.</p>
          <p className="mt-1">This guide does not replace a doctor. For persistent dermatitis, severe acne or allergies, see a dermatologist.</p>
        </div>

        {article.summary && (
          <div className="max-w-[68ch] mx-auto mt-8 border-l-4 border-brand pl-5 py-1">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">Quick takeaway</p>
            <p className="mt-2 text-[19px] leading-snug text-ink">{article.summary}</p>
          </div>
        )}

        <div className="max-w-[68ch] mx-auto mt-12 space-y-12">
          {article.sections.map((sec, idx) => (
            <section key={idx} className="space-y-4 border-t border-ink/15 pt-8">
              <h2 className="font-display font-semibold text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-tight">{sec.heading}</h2>

              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-[17px] leading-relaxed text-ink-muted">
                  {renderInline(p, link)}
                </p>
              ))}

              {sec.listItems && sec.listItems.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {sec.listItems.map((item, lIdx) => (
                    <li key={lIdx} className="pl-5 relative text-[17px] leading-relaxed text-ink-muted before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-ink">
                      {renderInline(item, link)}
                    </li>
                  ))}
                </ul>
              )}

              {sec.figure && (
                <figure className="pt-2">
                  <div className="relative aspect-[16/10] w-full max-w-[520px] rounded-[16px] overflow-hidden border border-ink/15 bg-white">
                    <Image src={getAssetPath(sec.figure.src)} alt={sec.figure.alt} fill sizes="(max-width: 768px) 100vw, 520px" className="object-contain p-4" />
                  </div>
                  <figcaption className="mt-2 text-[14px] text-ink-muted">{sec.figure.caption}</figcaption>
                </figure>
              )}

              {sec.table && (
                <div className="pt-2 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left border-t border-ink/20">
                    <thead>
                      <tr className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                        {sec.table.headers.map((h, hIdx) => (
                          <th key={hIdx} scope="col" className="py-3 pr-4 font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sec.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-t border-ink/20 align-top">
                          <th scope="row" className="py-3 pr-4 font-semibold text-ink">{row[0]}</th>
                          <td className="py-3 text-ink-muted">{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        {article.faq && article.faq.length > 0 && (
          <section className="max-w-[68ch] mx-auto mt-14 border-t border-ink/15 pt-8" aria-labelledby="faq-title">
            <h2 id="faq-title" className="font-display font-semibold text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-tight">Common questions</h2>
            <dl className="mt-6 space-y-6">
              {article.faq.map((f, i) => (
                <div key={i}>
                  <dt className="font-semibold text-ink text-[18px]">{f.q}</dt>
                  <dd className="mt-1.5 text-[17px] leading-relaxed text-ink-muted">{renderInline(f.a, link)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {article.sources && article.sources.length > 0 && (
          <section className="max-w-[68ch] mx-auto mt-14 border-t border-ink/15 pt-8" aria-labelledby="sources-title">
            <h2 id="sources-title" className="font-display font-semibold text-[clamp(1.25rem,1.1rem+0.8vw,1.5rem)] leading-tight">Sources</h2>
            <p className="mt-2 text-[15px] text-ink-muted">We read these pages when we wrote this article. Rules and advice can change, so check the originals.</p>
            <ol className="mt-4 list-decimal pl-5 space-y-2 text-[15px] leading-relaxed text-ink-muted">
              {article.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className={link}>{src.label}</a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {related.length > 0 && (
          <section className="max-w-[68ch] mx-auto mt-14 border-t border-ink/15 pt-8" aria-labelledby="related-title">
            <h2 id="related-title" className="font-display font-semibold text-[clamp(1.25rem,1.1rem+0.8vw,1.5rem)] leading-tight">Keep reading</h2>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/journal/${r.slug}`} className={`font-semibold ${link}`}>{r.title}</Link>
                  <p className="text-[15px] text-ink-muted">{r.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="max-w-[68ch] mx-auto mt-14 border-t border-ink/20 pt-6 text-[15px] text-ink-muted space-y-1">
          <p className="font-semibold text-ink">Retail disclosure</p>
          <p>GLOW VAI is an independent skincare retailer in India. We do not manufacture these products, and our recommendations are based on your scan results.</p>
        </div>

        <div className="max-w-[68ch] mx-auto mt-12 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-10 space-y-4">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl">Want to see what your skin needs?</h2>
          <p className="text-ink-muted">Take the free 30-second camera scan. It estimates hydration and pore health, and suggests a routine from our shop.</p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href="/face-analysis" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}>
              Scan my face, free
            </Link>
            <Link href="/shop" className={`inline-flex items-center justify-center min-h-[52px] px-6 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
              Browse the shop
            </Link>
          </div>
        </div>

        <p className="max-w-[68ch] mx-auto mt-10">
          <Link href="/journal" className={`font-semibold ${link}`}>← Back to the journal</Link>
        </p>
      </Section>
    </article>
  );
}
