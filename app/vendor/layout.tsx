import type { Metadata } from "next";
import type { ReactNode } from "react";

// The store pages are for signed-in vendors only: keep them out of search results.
export const metadata: Metadata = {
  title: "GlowVai store",
  robots: { index: false, follow: false },
};

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div className="vendor-web min-h-screen bg-paper text-ink">{children}</div>;
}
