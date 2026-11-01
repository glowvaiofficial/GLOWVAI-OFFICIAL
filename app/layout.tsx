import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { HeaderAndFooterWrapper } from "@/components/layout/HeaderAndFooterWrapper";
import { getLocationFromIP } from "@/lib/location";
import { SITE_URL } from "@/lib/site-url";
import { CookieNotice } from "@/components/consent/CookieNotice";
import { GA4Script } from "@/components/analytics/GA4Script";
import { RouteTracker } from "@/components/analytics/RouteTracker";

const displayFont = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700"],
  preload: true,
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "600"],
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#1447E6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION;
const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GLOW VAI | Skincare that starts with a face scan",
    template: "%s | GLOW VAI",
  },
  description: "Scan your face for free, get a plain-language skin report, and shop a routine that fits.",
  authors: [{ name: siteConfig.name, url: SITE_URL }],
  creator: siteConfig.name,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    title: "GLOW VAI | Skincare that starts with a face scan",
    description: "Scan your face for free, get a plain-language skin report, and shop a routine that fits.",
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GLOW VAI skincare",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    creator: "@glowvai",
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(googleVerification || yandexVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(yandexVerification ? { yandex: yandexVerification } : {}),
        },
      }
    : {}),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locationData = await getLocationFromIP();

  return (
    <html lang="en-IN" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-white text-ink flex flex-col font-sans selection:bg-brand selection:text-white">
        <GA4Script />
        <Suspense fallback={null}>
          <RouteTracker />
        </Suspense>
        <HeaderAndFooterWrapper city={locationData.city}>
          {children}
        </HeaderAndFooterWrapper>
        <CookieNotice />
      </body>
    </html>
  );
}
