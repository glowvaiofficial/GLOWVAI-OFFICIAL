import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { journalArticles } from "@/config/journal";
import { ORG_ID, WEBSITE_ID } from "@/lib/seo/entity-graph";
import {
  Clock,
  ArrowLeft,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Share2,
  CheckCircle2,
} from "lucide-react";

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
    "author": {
      "@type": "Person",
      "name": article.author.name,
      "jobTitle": article.author.role,
    },
    "publisher": { "@id": ORG_ID },
  };

  return (
    <article className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <JsonLd data={articleSchema} />
      <Container size="md">
        
        {/* Breadcrumb / Back Link */}
        <div className="mb-8">
          <Link
            href="/journal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Journal</span>
          </Link>
        </div>

        {/* Article Header */}
        <div className="space-y-4 max-w-[68ch] mx-auto mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>{article.readTime}</span>
            </span>
            <span className="text-xs text-ink-light">Published: {article.datePublished}</span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-5xl text-ink leading-tight">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed font-normal">
            {article.description}
          </p>

          <div className="pt-3 pb-6 border-b border-ink/10 flex items-center gap-3 text-xs text-ink">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">{article.author.name}</p>
              <p className="text-ink-muted">{article.author.role}</p>
            </div>
          </div>
        </div>

        {/* Medical & Cosmetic Disclaimer Callout */}
        <div className="bg-skymist/50 border border-brand/20 rounded-2xl p-4 sm:p-5 mb-10 max-w-[68ch] mx-auto flex items-start gap-3 text-xs text-ink">
          <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Cosmetic Insights Notice</p>
            <p className="text-ink-muted leading-relaxed">
              This guide is for informational purposes and does not substitute professional medical advice. If you experience persistent dermatitis, severe acne, or skin allergies, consult a certified dermatologist.
            </p>
          </div>
        </div>

        {/* Article Summary Box */}
        {article.summary && (
          <div className="bg-yellow/20 border border-yellow/50 rounded-2xl p-5 mb-10 max-w-[68ch] mx-auto space-y-2">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              Quick Takeaway
            </span>
            <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
              {article.summary}
            </p>
          </div>
        )}

        {/* Article Body Sections */}
        <div className="space-y-10 max-w-[68ch] mx-auto">
          {article.sections.map((sec, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-ink">
                {sec.heading}
              </h2>

              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-sm sm:text-base text-ink/85 leading-relaxed font-normal">
                  {p}
                </p>
              ))}

              {sec.listItems && sec.listItems.length > 0 && (
                <ul className="space-y-2.5 pt-1 pl-1">
                  {sec.listItems.map((item, lIdx) => (
                    <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink/80 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {sec.table && (
                <div className="pt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border border-ink/10 rounded-2xl overflow-hidden divide-y divide-ink/10">
                    <thead className="bg-skymist text-ink font-bold">
                      <tr>
                        {sec.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3 sm:p-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 bg-white">
                      {sec.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-skymist/30 transition-colors">
                          <td className="p-3 sm:p-4 font-bold text-brand">{row[0]}</td>
                          <td className="p-3 sm:p-4 text-ink-muted">{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Reseller Disclosure */}
        <div className="max-w-[68ch] mx-auto mt-14 pt-6 border-t border-ink/10 text-xs text-ink-muted space-y-1.5">
          <p className="font-semibold text-ink">Retail Disclosure</p>
          <p>
            GLOW VAI is an independent skincare retailer in India. We do not manufacture these products, and our recommendations are based on your scan results.
          </p>
        </div>

        {/* Conversion CTA Footer Banner */}
        <div className="max-w-[68ch] mx-auto mt-12 bg-ink text-white rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-lg">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-mint">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Match Your Skin</span>
          </div>
          <h3 className="font-display font-bold text-2xl text-white">
            Want to see which ingredients your skin needs?
          </h3>
          <p className="text-xs sm:text-sm text-white/75 max-w-md mx-auto leading-relaxed">
            Take our free 30-second camera scan to calculate hydration levels, pore health, and matched product routines.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link href="/face-analysis">
              <Button variant="primary" size="md" className="bg-brand hover:bg-brand-dark text-white font-bold">
                Start Free Face Scan
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" size="md" className="text-white border-white/20 hover:bg-white/10 font-bold">
                Explore Shop
              </Button>
            </Link>
          </div>
        </div>

      </Container>
    </article>
  );
}
