import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { ClientRedirect } from "@/components/seo/ClientRedirect";

export const metadata: Metadata = {
  title: "Shop",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/shop` },
};

export default function StoreRedirectPage() {
  return <ClientRedirect href="/shop" label="Shop skincare" />;
}
