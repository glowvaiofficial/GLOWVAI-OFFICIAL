import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-url";
import { careerAreas } from "@/config/subpages";
import { SubPageView } from "@/components/pages/SubPageView";

export const dynamicParams = false;

export function generateStaticParams() {
  return careerAreas.map((p) => ({ area: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area } = await params;
  const p = careerAreas.find((x) => x.slug === area);
  if (!p) return {};
  return {
    title: `${p.title} Careers`,
    description: p.intro,
    alternates: { canonical: `${SITE_URL}/careers/${p.slug}` },
    openGraph: { title: `${p.title} Careers | GLOW VAI`, description: p.intro, url: `${SITE_URL}/careers/${p.slug}` },
  };
}

export default async function CareerAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const p = careerAreas.find((x) => x.slug === area);
  if (!p) notFound();
  return <SubPageView page={p} parent={{ label: "careers", href: "/careers" }} />;
}
