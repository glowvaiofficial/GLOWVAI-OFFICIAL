import type { Metadata } from 'next';
import { GlowVaiShop } from '@/glowvai-app/GlowVaiShop';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Shop skincare',
  description: 'Scan your face, get a plain-language skin report, and shop a routine that fits. Fast delivery in Vijayawada.',
  alternates: {
    canonical: `${siteConfig.url}/shop`,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: `${siteConfig.url}/shop`,
    title: "Shop skincare | GLOW VAI",
    description: "Scan your face, get a plain-language skin report, and shop a routine that fits. Fast delivery in Vijayawada.",
    siteName: siteConfig.name,
    images: [{ url: "/og/shop-preview.png", width: 1200, height: 630, alt: "GLOW VAI app: face scan and skincare shop" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/shop-preview.png"],
  },
};

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ShopPage() {
  return <GlowVaiShop />;
}
