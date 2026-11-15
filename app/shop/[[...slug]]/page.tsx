import type { Metadata } from 'next';
import { Poppins, Syne } from 'next/font/google';
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

// Poppins (body and UI) and Syne (display: headings, hero, prices) for the shop, per the design spec. Poppins for the premium shop screens (mobile home, cart, checkout, payment, confirming, tracking). Self-hosted by
// next/font, so the browser loads it from this site (font-src 'self'). Exposed as --font-poppins; the rest of the shop keeps
// its own fonts.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: false,
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ShopPage() {
  return (
    <div className={`${poppins.variable} ${syne.variable}`} style={{ display: 'contents' }}>
      <AffiliateClickCapture />
      <GlowVaiShop />
    </div>
  );
}
