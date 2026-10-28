import { Metadata } from "next";
import { BRAND_NAME } from "@/config/site";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Partner Referral Program",
  description: "Earn ₹10 per verified referral + ₹1,000 milestone bonus as an Auto Driver Partner or Student Campus Ambassador with GLOW VAI.",
  alternates: {
    canonical: `${SITE_URL}/referral`,
  },
  openGraph: {
    title: `Partner Referral Program | ${BRAND_NAME}`,
    description: "Earn ₹10 per verified referral + ₹1,000 milestone bonus as an Auto Driver Partner or Student Campus Ambassador with GLOW VAI.",
    url: `${SITE_URL}/referral`,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Partner Referral Program | ${BRAND_NAME}`,
    description: "Earn ₹10 per verified referral + ₹1,000 milestone bonus as an Auto Driver Partner or Student Campus Ambassador with GLOW VAI.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
