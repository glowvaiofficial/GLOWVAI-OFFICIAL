import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { ClientRedirect } from "@/components/seo/ClientRedirect";

export const metadata: Metadata = {
  title: "About GLOW VAI",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/our-story` },
};

export default function AboutAliasPage() {
  return <ClientRedirect href="/our-story" label="Read our story" />;
}
