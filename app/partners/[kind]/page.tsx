import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-url";
import { partnerKinds } from "@/config/subpages";
import { SubPageView } from "@/components/pages/SubPageView";

export const dynamicParams = false;

export function generateStaticParams() {
  return partnerKinds.map((p) => ({ kind: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const p = partnerKinds.find((x) => x.slug === kind);
  if (!p) return {};
  return {
    title: p.title,
    description: p.intro,
    alternates: { canonical: `${SITE_URL}/partners/${p.slug}` },
    openGraph: { title: `${p.title} | GLOW VAI`, description: p.intro, url: `${SITE_URL}/partners/${p.slug}` },
  };
}

export default async function PartnerKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const p = partnerKinds.find((x) => x.slug === kind);
  if (!p) notFound();
  return <SubPageView page={p} parent={{ label: "partners", href: "/partners" }} />;
}
