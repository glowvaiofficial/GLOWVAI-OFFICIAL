import React from "react";
import Link from "next/link";
import { Section, focusRing } from "@/components/home/shared";
import { InfoHero } from "./InfoPage";
import { emailFor } from "@/config/emails";
import type { SubPageData } from "@/config/subpages";

export function SubPageView({ page, parent }: { page: SubPageData; parent: { label: string; href: string } }) {
  const mail = page.apply ? emailFor(page.apply.emailKey) : null;
  return (
    <div className="bg-paper text-ink">
      <InfoHero id={`${page.slug}-title`} eyebrow={page.eyebrow} title={page.title} intro={page.intro} />
      <Section pad="tight">
        <div className="border-t border-ink/20 grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {page.sections.map((s) => (
            <div key={s.title} className="py-6 border-b border-ink/20">
              <h2 className="font-display font-semibold text-2xl">{s.title}</h2>
              <ul className="mt-3 space-y-2 text-ink-muted">
                {s.items.map((it) => (
                  <li key={it} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-ink">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-5">
          {page.apply && mail && (
            <a
              href={`mailto:${mail}?subject=${encodeURIComponent(page.apply.subject)}`}
              className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}
            >
              {page.apply.label}
            </a>
          )}
          <Link href={parent.href} className={`font-medium underline underline-offset-[5px] rounded ${focusRing}`}>
            Back to {parent.label}
          </Link>
        </div>
        {mail && <p className="mt-3 text-sm text-ink-muted">Or write to {mail}.</p>}
      </Section>
    </div>
  );
}
