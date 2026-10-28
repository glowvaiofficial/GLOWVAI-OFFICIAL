import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";
import { journalArticles } from "@/config/journal";
import { BookOpen, Clock, ArrowRight, ScanLine, User, ShieldCheck } from "lucide-react";

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
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <JsonLd data={pageSchema} />
      <Container size="md">
        
        {/* Header Hero */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <Badge variant="brand" size="md">
            GLOW VAI Journal
          </Badge>
          <h1 className="font-display font-bold text-3xl sm:text-5xl text-ink leading-tight">
            Skin Basics, <span className="text-brand">Written Plainly</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl mx-auto">
            Practical breakdowns of ingredient lists, active percentages, and simple daily routines tailored for Indian weather.
          </p>
        </div>

        {/* Featured / Published Guides Section */}
        <div className="space-y-8 mb-16">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-ink flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand" />
              <span>Published Guides</span>
            </h2>
            <span className="text-xs text-ink-muted font-semibold">{publishedArticles.length} Guide Available</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {publishedArticles.map((article) => (
              <div
                key={article.id}
                className="bg-skymist/30 border border-brand/20 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                      <Clock className="w-3.5 h-3.5 text-brand" />
                      <span>{article.readTime}</span>
                    </span>
                    <span className="text-xs text-ink-light">Updated: {article.dateModified}</span>
                  </div>

                  <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink hover:text-brand transition-colors leading-snug">
                    <Link href={`/journal/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <User className="w-4 h-4 text-brand" />
                    <span>{article.author.name} ({article.author.role})</span>
                  </div>

                  <Link href={`/journal/${article.slug}`}>
                    <Button variant="primary" size="md" className="bg-brand hover:bg-brand-dark text-white font-bold gap-2">
                      <span>Read Full Guide</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Articles Preview */}
        {upcomingArticles.length > 0 && (
          <div className="space-y-6 mb-16">
            <div className="border-b border-ink/10 pb-3">
              <h2 className="font-display font-bold text-xl text-ink">
                Upcoming in the Journal
              </h2>
              <p className="text-xs text-ink-muted">Reviewed by certified dermatology advisors before publication.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white border border-ink/10 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-ink-muted bg-ink-subtle px-2.5 py-0.5 rounded-md">
                      {article.category}
                    </span>
                    <span className="text-[11px] text-coral font-bold bg-blush px-2 py-0.5 rounded-md">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-ink">
                    {article.title}
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Free Face Scan CTA */}
        <div className="bg-ink text-white rounded-3xl p-8 sm:p-12 text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-mint">
            <ScanLine className="w-3.5 h-3.5" />
            <span>AI Skin Telemetry</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Find Your Routine with a 30-Second Face Scan
          </h2>
          <p className="text-xs sm:text-sm text-white/75 max-w-lg mx-auto leading-relaxed">
            Take the free scan and see which products match your results.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link href="/face-analysis">
              <Button variant="primary" size="md" className="bg-brand hover:bg-brand-dark text-white font-bold">
                Start Free Face Scan
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" size="md" className="text-white border-white/20 hover:bg-white/10 font-bold">
                Browse Skincare Catalog
              </Button>
            </Link>
          </div>
          <div className="pt-3 flex items-center justify-center gap-2 text-[11px] text-white/60">
            <ShieldCheck className="w-3.5 h-3.5 text-mint" />
            <span>Photos stored privately • Free scan</span>
          </div>
        </div>

      </Container>
    </div>
  );
}
