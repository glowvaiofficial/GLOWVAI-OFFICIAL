import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-url";
import { helpTopics } from "@/config/subpages";
import { SubPageView } from "@/components/pages/SubPageView";

export const dynamicParams = false;

export function generateStaticParams() {
  return helpTopics.map((p) => ({ topic: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  const p = helpTopics.find((x) => x.slug === topic);
  if (!p) return {};
  return {
    title: p.title,
    description: p.intro,
    alternates: { canonical: `${SITE_URL}/help/${p.slug}` },
    openGraph: { title: `${p.title} | GLOW VAI`, description: p.intro, url: `${SITE_URL}/help/${p.slug}` },
  };
}

export default async function HelpTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const p = helpTopics.find((x) => x.slug === topic);
  if (!p) notFound();
  return <SubPageView page={p} parent={{ label: "help center", href: "/help" }} />;
}
