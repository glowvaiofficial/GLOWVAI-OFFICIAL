import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { concernPages } from "@/config/concerns";

export const metadata: Metadata = {
  title: "Shop by skin concern",
  description: "Pick the skin concern you want to work on and see simple, general guidance and matching products.",
  alternates: { canonical: `${SITE_URL}/concerns` },
};

// The index behind /concerns: one card per concern page, listed from the same config the footer and the pages use.
export default function ConcernsIndexPage() {
  return (
    <div className="bg-paper text-ink">
      <Section pad="tight" labelledBy="concerns-title">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className={`gv-link-inline underline underline-offset-4 rounded ${focusRing}`}>Home</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">Concerns</li>
          </ol>
        </nav>
        <Eyebrow>Shop by concern</Eyebrow>
        <h1 id="concerns-title" className="mt-4 font-display font-semibold text-[clamp(2.25rem,1.6rem+3.5vw,4rem)] leading-[1.05] tracking-[-0.03em] max-w-[18ch]">
          What would you like to work on?
        </h1>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {concernPages.map((c) => (
            <li key={c.slug}>
              <Link href={`/concerns/${c.slug}`} className={`group block rounded-[20px] border border-ink/15 bg-white overflow-hidden ${focusRing}`}>
                <div className="relative aspect-[4/3] bg-paper-deep">
                  <Image src={c.image} alt={c.imageAlt} fill sizes="(max-width: 640px) 90vw, 360px" className="object-cover" />
                </div>
                <div className="p-5">
                  <h2 className="font-display font-semibold text-xl">{c.name}</h2>
                  <p className="mt-2 text-ink-muted">{c.intro}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-medium">
                    See guidance <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10">
          <Link href="/shop" className={`inline-flex items-center gap-2 font-medium underline underline-offset-[5px] rounded ${focusRing}`}>
            Or browse the whole shop <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </p>
      </Section>
    </div>
  );
}
