import React from "react";
import OurStoryClient from "./OurStoryClient";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAboutPageGraph } from "@/lib/seo/entity-graph";
import { entityConfig } from "@/config/entity";

export const metadata = {
  title: "Our Story and Skincare Retail Brand",
  description: entityConfig.brand.description,
  alternates: {
    canonical: `${siteConfig.url}/our-story`,
  },
  openGraph: {
    title: "Our Story | GLOW VAI Skincare",
    description: entityConfig.brand.description,
    url: `${siteConfig.url}/our-story`,
    siteName: entityConfig.brand.name,
    type: "website",
  },
};

export default function OurStoryPage() {
  const aboutGraph = buildAboutPageGraph();

  return (
    <>
      <JsonLd data={aboutGraph} />
      <OurStoryClient />
    </>
  );
}
