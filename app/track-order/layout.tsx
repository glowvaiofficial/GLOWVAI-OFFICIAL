import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

const DESC = "Check the status of your GLOW VAI order using your order number and phone number.";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/track-order` },
  openGraph: { title: "Track Your Order | GLOW VAI", description: DESC, url: `${SITE_URL}/track-order` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
