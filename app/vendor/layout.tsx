import type { Metadata } from "next";
import type { ReactNode } from "react";

// The store pages are for signed-in vendors only: keep them out of search results.
export const metadata: Metadata = {
  title: "GlowVai store",
  robots: { index: false, follow: false },
};

// Same system UI stack as the shop (--gv-font in glowvai-app/glowvai.css); the vendor pages load no web fonts.
const VENDOR_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vendor-web min-h-screen bg-paper text-ink" style={{ fontFamily: VENDOR_FONT }}>
      {children}
    </div>
  );
}
