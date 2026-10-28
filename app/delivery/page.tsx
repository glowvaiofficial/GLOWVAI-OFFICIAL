import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { QuickDeliveryExplainer } from "@/components/sections/QuickDeliveryExplainer";
import { Zap, Clock, ShieldCheck, MapPin, PackageCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";

export const metadata: Metadata = {
  title: "15-Minute Express Dark Store Delivery",
  description: "Learn how GLOW VAI delivers fresh skincare formulations in under 15 minutes using cold-chain neighborhood micro-hubs across Vijayawada and Andhra Pradesh.",
  alternates: {
    canonical: `${SITE_URL}/delivery`,
  },
  openGraph: {
    title: "15-Minute Express Dark Store Delivery | GLOW VAI",
    description: "Learn how GLOW VAI delivers fresh skincare formulations in under 15 minutes using cold-chain neighborhood micro-hubs across Vijayawada and Andhra Pradesh.",
    url: `${SITE_URL}/delivery`,
  },
};

export default function DeliveryPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema(
      "/delivery",
      "15-Minute Express Dark Store Delivery | GLOW VAI",
      "Learn how GLOW VAI delivers fresh skincare formulations in under 15 minutes using cold-chain neighborhood micro-hubs across Vijayawada and Andhra Pradesh."
    ),
  };
  return (
    <main className="min-h-screen bg-ink-subtle text-ink py-12 sm:py-20">
      <JsonLd data={pageSchema} />
      <Container>
        {/* Header Hero */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <span className="text-xs font-semibold text-brand uppercase tracking-widest bg-skymist px-3 py-1 rounded-full border border-brand/20 inline-block">
            ⚡ Quick-Commerce Dark Store Logistics
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl text-ink leading-tight">
            Fresh Skincare at Your Doorstep in <span className="text-brand">~15 Minutes</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-muted font-normal leading-relaxed">
            GLOW VAI operates hyper-local temperature-controlled micro-hubs stocked with Minimalist, The Derma Co, and custom AI formulation routines.
          </p>
        </div>

        {/* 3 Delivery Promises */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-skymist text-brand flex items-center justify-center border border-brand/10">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">15-Minute Dispatch</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Orders are picked, packed into temperature-safe tamper-proof boxes, and dispatched with dedicated electric riders in seconds.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-ink flex items-center justify-center border border-mint">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Cold-Chain Preserved</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Active ingredients like Vitamin C, Niacinamide, and Retinol degrade under high temperatures. Our stores remain at a strict 4°C to 18°C.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow text-ink flex items-center justify-center border border-yellow-hover">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Hyper-Local Micro Hubs</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Our dark stores are strategically placed within a 3km radius of key residential sectors in Vijayawada & Visakhapatnam.
            </p>
          </div>
        </div>

        {/* Live Delivery Explainer & Pincode Checker Component */}
        <QuickDeliveryExplainer />

        {/* FAQ Quick CTA */}
        <div className="bg-white p-8 rounded-3xl border border-ink/10 shadow-lg text-center space-y-4 max-w-2xl mx-auto my-12">
          <h2 className="font-display font-bold text-2xl text-ink">Have questions about your active order?</h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Reach out directly to our Vijayawada logistics team or start a free AI face scan while your order is prepared.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/face-analysis">
              <Button variant="primary" size="md" className="bg-brand text-white font-bold">
                Start Free Face Scan
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="md" className="text-ink-muted font-bold">
                Contact Customer Care
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
