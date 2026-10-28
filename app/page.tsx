import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { FaceAnalysisFeature } from "@/components/sections/FaceAnalysisFeature";
import { Bestsellers } from "@/components/sections/Bestsellers";
import { ShopByConcern } from "@/components/sections/ShopByConcern";
import { WhyWeStarted } from "@/components/sections/WhyWeStarted";
import { BrandValues } from "@/components/sections/BrandValues";
import { QuickDeliveryExplainer } from "@/components/sections/QuickDeliveryExplainer";
import { ReferralAndVendorSection } from "@/components/sections/ReferralAndVendorSection";
import { TestimonialsGrid } from "@/components/sections/TestimonialsGrid";
import { JournalTeaser } from "@/components/sections/JournalTeaser";
import { FAQSection } from "@/components/sections/FAQSection";
import { FinalCTABanner } from "@/components/sections/FinalCTABanner";
import { getLocationFromIP } from "@/lib/location";

import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeGraph } from "@/lib/seo/entity-graph";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "GLOW VAI | Skincare that starts with a face scan",
  description: "Scan your face for free, get a plain-language skin report, and shop curated Minimalist and The Derma Co routines with WhatsApp ordering in India.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "GLOW VAI | Skincare that starts with a face scan",
    description: "Scan your face for free, get a plain-language skin report, and shop curated Minimalist and The Derma Co routines with WhatsApp ordering in India.",
    url: SITE_URL,
  },
};

export default async function HomePage() {
  const locationData = await getLocationFromIP();
  const homeGraph = buildHomeGraph();

  return (
    <>
      <JsonLd data={homeGraph} />
      {/* Section 1: Hero */}
      <Hero city={locationData.city} />

      {/* Section 2: Trust Strip */}
      <TrustStrip />

      {/* Section 3: Face Analysis Feature */}
      <FaceAnalysisFeature />

      {/* Section 4: Bestsellers */}
      <Bestsellers />

      {/* Section 5: Shop By Concern */}
      <ShopByConcern />

      {/* Section 6: Referral Program & Vendor Network */}
      <ReferralAndVendorSection />

      {/* Section 7: Why We Started (Founder Story) */}
      <WhyWeStarted />

      {/* Section 8: Brand Values */}
      <BrandValues />

      {/* Section 9: Quick Delivery Explainer */}
      <QuickDeliveryExplainer />

      {/* Section 10: Testimonials & UGC Grid */}
      <TestimonialsGrid />

      {/* Section 11: Journal Teaser */}
      <JournalTeaser />

      {/* Section 12: FAQ */}
      <FAQSection />

      {/* Section 13: Final CTA Banner & Newsletter */}
      <FinalCTABanner />
    </>
  );
}
