import { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Contact & Customer Support",
  description: "Get in touch with GLOW VAI customer support for assistance with your skin analysis report, product recommendations, or order dispatch.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: "Contact & Customer Support | GLOW VAI",
    description: "Get in touch with GLOW VAI customer support for assistance with your skin analysis report, product recommendations, or order dispatch.",
    url: `${SITE_URL}/contact`,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Customer Support | GLOW VAI",
    description: "Get in touch with GLOW VAI customer support for assistance with your skin analysis report, product recommendations, or order dispatch.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
