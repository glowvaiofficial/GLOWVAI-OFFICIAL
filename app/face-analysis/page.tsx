import React from "react";
import { FaceAnalysisClient } from "./FaceAnalysisClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  title: "Free AI Face Scan & Skin Analysis",
  description: "Scan your face for free in 30 seconds using your browser camera. Get a plain-language skin report and matching skincare routine.",
  alternates: {
    canonical: `${SITE_URL}/face-analysis`,
  },
  openGraph: {
    title: "Free AI Face Scan & Skin Analysis | GLOW VAI",
    description: "Instant 30-second camera skin check for hydration, barrier depth, and pore health.",
    url: `${SITE_URL}/face-analysis`,
    siteName: "GLOW VAI",
    type: "website",
  },
};

export default function FaceAnalysisPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema(
        "/face-analysis",
        "GLOW VAI | Free AI Face Scan & Skin Report",
        "Scan your face for free in 30 seconds and get a plain-language skin report for Indian weather."
      ),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <FaceAnalysisClient />
    </>
  );
}
