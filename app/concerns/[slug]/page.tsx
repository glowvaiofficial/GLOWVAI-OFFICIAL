import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, ScanLine } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { ConcernProducts } from "@/components/concerns/ConcernProducts";
import { concernPages, concernBySlug } from "@/config/concerns";
import { filterProducts } from "@/lib/catalog";
import { MEDICAL_NOTE } from "@/config/privacy-copy";

export const dynamicParams = false;

export function generateStaticParams() {
  return concernPages.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = concernBySlug(slug);
  if (!c) return {};
  const title = `${c.name} Skincare`;
  return {
    title,
    description: c.intro,
    alternates: { canonical: `${SITE_URL}/concerns/${c.slug}` },
    openGraph: { title: `${title} | GLOW VAI`, description: c.intro, url: `${SITE_URL}/concerns/${c.slug}` },
  };
}

export default async function ConcernLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = concernBySlug(slug);
  if (!c) notFound();
  const products = filterProducts({ concern: c.key });
  const link = `underline underline-offset-4 rounded ${focusRing}`;

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="tight" labelledBy="concern-title">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className={link}>Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/shop" className={link}>Shop</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium">{c.name}</li>
          </ol>
        </nav>

        {/* Concern switcher: the shop filter as links */}
        <nav aria-label="Shop by concern" className="mb-10 -mx-1 flex flex-wrap gap-2">
          {concernPages.map((x) => (
            <Link
              key={x.slug}
              href={`/concerns/${x.slug}`}
              aria-current={x.slug === c.slug ? "page" : undefined}
              className={`inline-flex items-center min-h-[44px] px-4 rounded-[10px] border text-[15px] font-medium ${focusRing} ${
                x.slug === c.slug ? "bg-brand border-brand text-white" : "bg-white border-ink/20 text-ink hover:border-ink"
              }`}
            >
              {x.name}
            </Link>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Shop by concern · {c.name}</Eyebrow>
            <h1 id="concern-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[18ch]">
              {c.title}
            </h1>
            <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[50ch]">{c.intro}</p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link href="#products">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  <span>See {products.length} product{products.length === 1 ? "" : "s"}</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/face-analysis" className={`inline-flex items-center gap-2 font-medium underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
                <ScanLine className="w-4 h-4" aria-hidden="true" />
                Not sure? Take the free scan
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-ink/15 bg-paper-deep">
              <Image src={c.image} alt={c.imageAlt} fill priority sizes="(max-width: 1024px) 90vw, 480px" className="object-cover" />
            </div>
          </div>
        </div>
      </Section>

      {/* Signs and ingredients */}
      <Section tone="deep" pad="tight" labelledBy="signs-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
          <div className="lg:col-span-5">
            <SectionTitle id="signs-title">You might notice</SectionTitle>
            <ul className="mt-6 border-t border-ink/20">
              {c.signs.map((s) => (
                <li key={s} className="py-4 border-b border-ink/20 text-lg">{s}</li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <h2 className="font-display font-semibold text-[clamp(1.875rem,1.3rem+2.4vw,3rem)] leading-[1.08] tracking-[-0.02em]">What to look for</h2>
            <ul className="mt-6 border-t border-ink/20">
              {c.look.map((l) => (
                <li key={l.name} className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-x-6 py-4 border-b border-ink/20">
                  <span className="font-display font-semibold text-lg">{l.name}</span>
                  <span className="text-ink-muted">{l.why}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Products */}
      <Section id="products" pad="tight" labelledBy="products-title">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <SectionTitle id="products-title">Products for {c.name.toLowerCase()}</SectionTitle>
          <Link href={`/shop?concern=${c.key}`} className={`inline-flex items-center gap-2 font-medium underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
            Filter in the shop <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <ConcernProducts products={products} />
      </Section>

      {/* Routine and avoid */}
      <Section tone="deep" pad="tight" labelledBy="routine-title">
        <SectionTitle id="routine-title">A simple routine</SectionTitle>
        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {c.routine.map((r, i) => (
            <li key={r.step} className="border-t-2 border-ink pt-4">
              <p className="font-mono text-xs tracking-[0.12em] text-ink-muted">0{i + 1}</p>
              <h3 className="mt-2 font-display font-semibold text-2xl">{r.step}</h3>
              <p className="mt-1 text-ink-muted">{r.tip}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 border-t border-ink/20 pt-8">
          <h2 className="lg:col-span-4 font-display font-semibold text-2xl">Try to avoid</h2>
          <ul className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {c.avoid.map((a) => (
              <li key={a} className="bg-white border border-ink/15 rounded-[10px] px-4 py-3">{a}</li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-[14px] text-ink-light">{MEDICAL_NOTE} See a dermatologist if a problem is painful, spreading or not improving.</p>
      </Section>
    </div>
  );
}
