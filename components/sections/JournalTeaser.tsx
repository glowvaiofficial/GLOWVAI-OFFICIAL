import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { journalArticles } from "@/config/journal";
import { ArrowRight, Clock, BookOpen, Sparkles } from "lucide-react";

export function JournalTeaser() {
  const publishedArticles = journalArticles.filter((a) => a.status === "published");

  if (publishedArticles.length === 0) {
    return (
      <section id="journal" className="py-16 sm:py-20 bg-white border-t border-ink/10">
        <Container size="md">
          <div className="bg-skymist/40 rounded-3xl p-8 sm:p-10 border border-brand/15 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-xs font-bold text-brand uppercase tracking-wider block">
                Journal
              </span>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-ink">
                Skin basics, written plainly. First articles are on the way.
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted">
                No fluff. Honest science on reading ingredient lists, humidity protection, and daily routines.
              </p>
            </div>
            <Link href="#newsletter" className="shrink-0">
              <Button variant="primary" size="md" className="gap-2  text-button-label">
                <Sparkles className="w-4 h-4 text-ink shrink-0" />
                <span>Get Notified</span>
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  const [featured, ...others] = publishedArticles;

  return (
    <section id="journal" className="py-20 sm:py-28 bg-white border-t border-ink/10">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14">
          <SectionHeading
            eyebrow="Skin Education"
            title="No fluff. Honest science you can actually use."
            description="Skin basics, written plainly. First articles on ingredient reading, humidity care, and simple routines."
            className="mb-0 max-w-2xl"
          />
          <Link href="/journal" className="mt-4 md:mt-0">
            <Button variant="outline" size="md" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Read Journal</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Featured Wide Article (2 Cols / 8 Cols desktop) */}
          <Link
            href={`/journal/${featured.slug}`}
            className="lg:col-span-7 group bg-white rounded-3xl overflow-hidden border border-ink/10 hover:border-brand/30 hover:shadow-card transition-all flex flex-col justify-between block"
          >
            <div>
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-skymist">
                <PlaceholderImage alt={featured.title} caption={featured.imageSlot || "Editorial skincare guide"} />
                <div className="absolute top-4 left-4 z-10">
                  <Badge variant="brand" size="sm">
                    {featured.category}
                  </Badge>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>{featured.readTime}</span>
                </div>
                <h3 className="font-display font-bold text-2xl text-ink group-hover:text-brand transition-colors leading-snug">
                  {featured.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {featured.excerpt}
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8 pt-0 flex items-center text-sm font-bold text-brand group-hover:text-coral transition-colors gap-1">
              <span>Read Full Guide</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Stacked Articles on Right (5 Cols desktop) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            {others.map((article) => (
              <Link
                key={article.id}
                href={`/journal/${article.slug}`}
                className="group bg-white rounded-3xl p-6 border border-ink/10 hover:border-brand/30 hover:shadow-card transition-all space-y-3 block"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="skymist" size="sm">
                    {article.category}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Clock className="w-3.5 h-3.5 text-brand" />
                    <span>{article.readTime}</span>
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg text-ink group-hover:text-brand transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="pt-2 flex items-center text-xs font-bold text-brand group-hover:text-coral transition-colors gap-1">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
