import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageGraph } from "@/lib/seo/entity-graph";
import { SITE_URL } from "@/lib/site-url";
import { Newspaper, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Press and Media Mentions",
  description: "Official press coverage and media mentions for GLOW VAI skincare retail and AI technology.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE_URL}/press`,
  },
};

export interface PressMention {
  publication: string;
  date: string;
  title: string;
  link: string;
  summary: string;
}

// TODO: Populate with verified external press coverage when published
const pressMentions: PressMention[] = [];

export default function PressPage() {
  const pageGraph = buildWebPageGraph("/press", "Press & Media | GLOW VAI", "Press coverage and news mentions for GLOW VAI.");

  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <JsonLd data={pageGraph} />
      <Container size="md">
        
        {/* Header */}
        <div className="space-y-4 text-center max-w-2xl mx-auto mb-12">
          <Badge variant="brand" size="md">
            Press & Media
          </Badge>
          <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
            GLOW VAI in the <Accent>News</Accent>
          </h1>
          <p className="text-body-lg text-ink-muted leading-relaxed">
            Official media coverage, press mentions, and startup feature stories.
          </p>
        </div>

        {/* Press Items or Empty State */}
        {pressMentions.length === 0 ? (
          <div className="bg-skymist/30 border-2 border-dashed border-ink/20 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Newspaper className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">No Press Mentions Yet</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              We list media coverage only when verified articles from independent news publications are published. Check back soon for updates.
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white font-bold text-xs hover:bg-brand-dark transition-colors"
              >
                <span>Media & Press Inquiries</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
            {pressMentions.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-ink/10 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-brand">
                  <span>{item.publication}</span>
                  <span className="text-ink-muted font-normal">{item.date}</span>
                </div>
                <h2 className="font-display font-bold text-lg text-ink">{item.title}</h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">{item.summary}</p>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline pt-2"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}

      </Container>
    </div>
  );
}
