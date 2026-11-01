import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bike, Shield, Clock, MapPin, CheckCircle2, AlertTriangle, ArrowRight, Phone, MessageCircle } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";
import { DeliverySection } from "@/components/home/DeliverySection";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { getAssetPath } from "@/lib/utils";

const DESCRIPTION =
  "Orders are packed at licensed partner pharmacies in Vijayawada and dispatched by local riders, reaching your doorstep in about 15 minutes in covered areas.";

export const metadata: Metadata = {
  title: "15-Minute Skincare Delivery in Vijayawada | GLOW VAI",
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/delivery`,
  },
  openGraph: {
    title: "15-Minute Skincare Delivery in Vijayawada | GLOW VAI",
    description: DESCRIPTION,
    url: `${SITE_URL}/delivery`,
  },
};

const hubs = [
  { name: "Benz Circle & MG Road", pincode: "520010", status: "Active (Avg 12 min)", note: "Central hub servicing Labbipet, Patamata & Siddhartha Nagar" },
  { name: "One Town & Governorpet", pincode: "520001", status: "Active (Avg 14 min)", note: "Historic commerce corridor & bus station periphery" },
  { name: "Kanuru & Penamaluru", pincode: "520007", status: "Active (Avg 15 min)", note: "Educational institution cluster & residential avenues" },
  { name: "Bhavanipuram & Gollapudi", pincode: "520012", status: "Active (Avg 15 min)", note: "West Vijayawada bypass & Krishna river corridor" },
  { name: "Auto Nagar & Enikepadu", pincode: "520008", status: "Active (Avg 14 min)", note: "Commercial and suburban growth zones" },
];

const fulfillmentSteps = [
  {
    step: "01",
    title: "Algorithmic Routing (<30s)",
    desc: "Your order is instantly paired with the nearest partner store holding live verified inventory.",
  },
  {
    step: "02",
    title: "Sealed Hub Picking (<2 min)",
    desc: "Licensed pharmacy staff inspect batch codes and place tamper-evident seals on your routine.",
  },
  {
    step: "03",
    title: "Rider Dispatch (<3 min)",
    desc: "A nearby dedicated courier receives the parcel and navigates via optimized local routes.",
  },
  {
    step: "04",
    title: "Doorstep OTP Handoff (~15 min)",
    desc: "Verify your order on arrival with a secure one-time delivery pass code.",
  },
];

export default function DeliveryPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema("/delivery", "About 15-Minute Delivery in Vijayawada | GLOW VAI", DESCRIPTION),
  };

  return (
    <div className="bg-paper text-ink">
      <JsonLd data={pageSchema} />

      {/* Hero */}
      <Section pad="md" labelledBy="delivery-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Hyperlocal Quick Commerce</Eyebrow>
            <h1
              id="delivery-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
            >
              Fresh skincare at your door in <span className="text-brand">about 15 minutes.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[50ch]">
              No waiting 3 to 5 days for long-haul courier trucks. We pack from licensed partner pharmacies right in your Vijayawada neighborhood and send by local rider.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#pincode-checker">
                <Button variant="primary" size="lg">
                  <span>Check Your Pincode</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Button>
              </a>
              <Link href="/shop" className={`inline-flex items-center gap-2 font-medium underline underline-offset-4 rounded ${focusRing}`}>
                Browse in-stock formulas
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-ink/15 shadow-sm bg-paper-deep">
              <Image
                src={getAssetPath("/images/home-ai/express_delivery.png")}
                alt="15-minute rider delivery in Vijayawada"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Fulfillment Pipeline */}
      <Section tone="deep" pad="tight" labelledBy="pipeline-title">
        <Eyebrow>Precision Logistics</Eyebrow>
        <SectionTitle id="pipeline-title" className="mt-2">How we achieve 15 minutes</SectionTitle>
        <p className="mt-3 text-ink-muted max-w-xl">
          By eliminating central warehouses and utilizing neighbourhood pharmacy dark-nodes, we cut transit times by 98%.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fulfillmentSteps.map((s) => (
            <div key={s.step} className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs space-y-3">
              <span className="font-mono text-sm text-brand font-semibold">{s.step}</span>
              <h3 className="font-display font-semibold text-xl text-ink">{s.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Active Hubs in Vijayawada */}
      <Section pad="md" labelledBy="hubs-title">
        <div className="max-w-[760px] mb-8">
          <Eyebrow>Coverage Network</Eyebrow>
          <SectionTitle id="hubs-title" className="mt-2">Active Fulfillment Hubs in Vijayawada</SectionTitle>
          <p className="mt-3 text-ink-muted">
            Orders placed within a 4 km radius of these hubs are serviced with our standard 15-minute speed guarantee.
          </p>
        </div>

        <div className="bg-white border border-ink/15 rounded-[24px] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/15 bg-paper-deep text-ink">
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Hub Location</th>
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Pincode</th>
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Live Speed</th>
                  <th scope="col" className="py-4 px-6 font-mono text-xs uppercase tracking-wider font-semibold">Service Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 text-sm">
                {hubs.map((hub) => (
                  <tr key={hub.pincode} className="hover:bg-paper/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-ink">{hub.name}</td>
                    <td className="py-4 px-6 font-mono text-ink-light">{hub.pincode}</td>
                    <td className="py-4 px-6 font-mono text-[#0B5C3B] font-medium">{hub.status}</td>
                    <td className="py-4 px-6 text-ink-muted">{hub.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Embed Interactive Delivery Section / Pincode tool */}
      <div id="pincode-checker">
        <DeliverySection />
      </div>

      {/* Safety & Temperature Guarantee */}
      <Section tone="deep" pad="tight" labelledBy="safety-title">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <SectionTitle id="safety-title">Temperature & Freshness Guarantee</SectionTitle>
            <p className="text-sm text-ink-muted leading-relaxed">
              Unlike traditional couriers where sensitive skincare serums bake for days inside hot transit containers, our products are stored in climate-controlled partner pharmacies and delivered directly to you in insulated rider pouches.
            </p>
            <ul className="space-y-2.5 pt-1">
              {[
                "100% genuine batch codes verified with official brand distributors",
                "Tamper-evident seals on every bottle and jar",
                "Rider safety first: during severe storms, delivery timers pause transparently",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5C3B] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 sm:p-8 space-y-4 shadow-2xs">
            <h3 className="font-display font-semibold text-xl text-ink">Questions about an active delivery?</h3>
            <p className="text-sm text-ink-muted">
              Our dispatch coordinator at Benz Circle is available via WhatsApp or phone.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="https://wa.me/918977855998"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 min-h-[46px] px-6 rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors ${focusRing}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Support</span>
              </a>
              <a
                href="tel:+918977855998"
                className={`inline-flex items-center gap-2 min-h-[46px] px-6 rounded-[10px] border border-ink/20 bg-white font-semibold text-sm hover:border-ink transition-colors ${focusRing}`}
              >
                <Phone className="w-4 h-4" />
                <span>Call Dispatch</span>
              </a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
