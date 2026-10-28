import React from "react";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";

export function InfoHero({ eyebrow, title, intro, id }: { eyebrow: string; title: string; intro: string; id: string }) {
  return (
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
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 id={id} className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[20ch]">
        {title}
      </h1>
      <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[56ch]">{intro}</p>
    </Section>
  );
}

export function RuledList({ items }: { items: { title: string; body: React.ReactNode; href?: string }[] }) {
  return (
    <ul className="border-t border-ink/20 grid grid-cols-1 md:grid-cols-2">
      {items.map((it) => (
        <li key={it.title} className="border-b border-ink/20 py-5 md:pr-8">
          <h3 className="font-display font-semibold text-xl text-ink">
            {it.href ? (
              <Link href={it.href} className={`underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
                {it.title}
              </Link>
            ) : (
              it.title
            )}
          </h3>
          <div className="mt-1 text-ink-muted">{it.body}</div>
        </li>
      ))}
    </ul>
  );
}
