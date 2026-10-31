import type { Metadata } from 'next';
import { GlowVaiShop } from '@/glowvai-app/GlowVaiShop';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Shop skincare',
  description: 'Scan your face, get a plain-language skin report, and shop a routine that fits. Fast delivery in Vijayawada.',
  alternates: {
    canonical: `${siteConfig.url}/shop`,
  },
};

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ShopPage() {
  return <GlowVaiShop />;
}
