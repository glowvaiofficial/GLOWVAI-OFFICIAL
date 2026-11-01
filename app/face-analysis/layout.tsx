import { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "AI Face Scan & Instant Skin Check",
  description: "Scan your face in 30 seconds for a free instant skin check, plain-language analysis, and personalized routine recommendation.",
  alternates: {
    canonical: `${SITE_URL}/face-analysis`,
  },
  openGraph: {
    title: "AI Face Scan & Instant Skin Check | GLOW VAI",
    description: "Scan your face in 30 seconds for a free instant skin check, plain-language analysis, and personalized routine recommendation.",
    url: `${SITE_URL}/face-analysis`,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Face Scan & Instant Skin Check | GLOW VAI",
    description: "Scan your face in 30 seconds for a free instant skin check, plain-language analysis, and personalized routine recommendation.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function FaceAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
