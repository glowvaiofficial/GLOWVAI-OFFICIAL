import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhatScanChecks } from "@/components/home/WhatScanChecks";
import { ShopByConcernSection } from "@/components/home/ShopByConcernSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { DeliverySection } from "@/components/home/DeliverySection";
import { StorySection, PromisesSection } from "@/components/home/StoryAndPromises";
import { FeedbackSection } from "@/components/home/FeedbackSection";
import { FaqHome, FinalCta } from "@/components/home/FaqAndFinalCta";
import { HomeTracking } from "@/components/home/HomeTracking";
import { getLocationFromIP } from "@/lib/location";

import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeGraph } from "@/lib/seo/entity-graph";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "GLOW VAI | Free AI Skin Scan and 15-Min Skincare Delivery",
  description:
    "Scan your face free in 30 seconds, get a plain-language skin report, and shop a matched routine delivered in about 15 minutes in Vijayawada.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: "GLOW VAI",
    locale: "en_IN",
    title: "GLOW VAI | Free AI Skin Scan and 15-Min Skincare Delivery",
    description:
      "Scan your face free in 30 seconds, get a plain-language skin report, and shop a matched routine delivered in about 15 minutes in Vijayawada.",
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GLOW VAI: skincare that starts with a face scan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@glowvai",
    creator: "@glowvai",
    title: "GLOW VAI | Free AI Skin Scan and 15-Min Skincare Delivery",
    description:
      "Scan your face free in 30 seconds, get a plain-language skin report, and shop a matched routine delivered in about 15 minutes in Vijayawada.",
    images: ["/opengraph-image"],
  },
};

export default async function HomePage() {
  const locationData = await getLocationFromIP();
  const homeGraph = buildHomeGraph();

  return (
    <>
      <JsonLd data={homeGraph} />
      <HomeTracking />
      <HomeHero city={locationData.city} />
      <HowItWorks />
      <WhatScanChecks />
      <ShopByConcernSection />
      <FeaturedProducts />
      <DeliverySection />
      <StorySection />
      <PromisesSection />
      <FeedbackSection />
      <FaqHome />
      <FinalCta />
    </>
  );
}
