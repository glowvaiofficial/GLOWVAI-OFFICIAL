import type { Metadata } from 'next';
import { GlowVaiShop } from '@/glowvai-app/GlowVaiShop';
import { siteConfig } from '@/config/site';
import { AffiliateClickCapture } from '@/components/affiliate/AffiliateClickCapture';

export const metadata: Metadata = {
  title: 'Shop skincare',
  description: 'Scan your face, get a plain-language skin report, and shop a routine that fits. Fast delivery in Vijayawada.',
  alternates: {
    canonical: `${siteConfig.url}/shop`,
  },
};

// Fonts: the shop uses Roboto, self-hosted by next/font in app/layout.tsx (--font-roboto), through the one token --gv-font in glowvai-app/glowvai.css.

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ShopPage() {
  return (
    <div style={{ display: 'contents' }}>
      <AffiliateClickCapture />
      <GlowVaiShop />
    </div>
  );
}
