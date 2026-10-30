import React from "react";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { AlertCircle } from "lucide-react";

export function DocPage({
  id,
  eyebrow,
  title,
  updated,
  draft,
  sections,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  updated: string;
  draft?: boolean;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper text-ink">
      <Section pad="tight" labelledBy={id}>
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className={`underline underline-offset-4 rounded ${focusRing}`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">{eyebrow}</li>
          </ol>
        </nav>

        {draft && (
          <div role="note" className="mb-8 flex items-start gap-3 rounded-[10px] border border-ink/25 bg-white p-4 text-[15px]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-brand" aria-hidden="true" />
            <p>
              <strong className="font-semibold">Draft for legal review.</strong> This text is not final until it has been approved by a lawyer.
            </p>
          </div>
        )}

        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id={id} className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,4.5rem)] leading-[1] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-4 text-[15px] text-ink-light">Last updated: {updated}</p>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
          <nav aria-label="On this page" className="hidden lg:block lg:col-span-3 lg:sticky lg:top-[96px]">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted mb-3">On this page</p>
            <ol className="space-y-2 border-l border-ink/20">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`block pl-4 py-1 text-[15px] text-ink-muted hover:text-ink hover:border-ink -ml-px border-l-2 border-transparent rounded ${focusRing}`}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="lg:col-span-8 lg:col-start-5 space-y-12 max-w-[70ch]">{children}</div>
        </div>
      </Section>
    </div>
  );
}

export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-ink/15 pt-8 space-y-4 text-[17px] leading-relaxed text-ink-muted">
      <h2 id={`${id}-h`} className="font-display font-semibold text-2xl text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-ink">
          {it}
        </li>
      ))}
    </ul>
  );
}
