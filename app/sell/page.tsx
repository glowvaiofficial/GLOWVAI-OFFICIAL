import type { Metadata } from "next";
import { SellOnGlowVai } from "@/components/affiliate/SellOnGlowVai";
import { sellerEntryFor } from "@/lib/shop/affiliate/seller";
import { SITE_URL } from "@/lib/site-url";

// Read at request time so the owner's VENDOR_APPLY_URL takes effect without a rebuild.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell on GlowVai",
  description: "How sellers join GlowVai: apply and manage orders in the GlowVai Vendor app.",
  alternates: { canonical: `${SITE_URL}/sell` },
};

export default function SellPage() {
  const entry = sellerEntryFor({ VENDOR_APPLY_URL: process.env.VENDOR_APPLY_URL });
  return (
    <div className="bg-paper text-ink">
      <SellOnGlowVai entry={entry} />
    </div>
  );
}
