import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebPageSchema } from "@/lib/seo/schema/webpage";
import { DeliverySection } from "@/components/home/DeliverySection";
import { Section } from "@/components/home/shared";

const DESCRIPTION =
  "Orders are packed at partner stores in Vijayawada and sent by rider, in about 15 minutes in covered areas. Check your pincode to see if delivery reaches you.";

export const metadata: Metadata = {
  title: "About 15-Minute Delivery in Vijayawada",
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/delivery`,
  },
  openGraph: {
    title: "About 15-Minute Delivery in Vijayawada | GLOW VAI",
    description: DESCRIPTION,
    url: `${SITE_URL}/delivery`,
  },
};

const factors = [
  { title: "Distance", body: "How far your address is from the partner store that packs your order." },
  { title: "Traffic", body: "Road and traffic conditions on the day." },
  { title: "Weather", body: "Heavy rain can slow riders down." },
  { title: "Stock", body: "If an item is out of stock at the nearest store, we will tell you before dispatch." },
];

export default function DeliveryPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    ...buildWebPageSchema("/delivery", "About 15-Minute Delivery in Vijayawada | GLOW VAI", DESCRIPTION),
  };

  return (
    <div className="bg-paper text-ink">
      <JsonLd data={pageSchema} />

      <Section pad="md" labelledBy="delivery-page-title">
        <h1
          id="delivery-page-title"
          className="font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[18ch]"
        >
          About 15 minutes, in covered areas of Vijayawada.
        </h1>
        <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[52ch]">
          Orders are packed at partner stores in Vijayawada and sent by rider. The time is an estimate, and it depends on
          the things below.
        </p>

        <ul className="mt-10 border-t border-ink/20 grid grid-cols-1 md:grid-cols-2">
          {factors.map((f) => (
            <li key={f.title} className="border-b border-ink/20 py-5 pr-6">
              <h2 className="font-display font-semibold text-xl text-ink">{f.title}</h2>
              <p className="mt-1 text-ink-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <DeliverySection />

      <Section tone="paper" pad="tight">
        <div className="border-t border-ink/20 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-2xl text-ink">Questions about an order?</h2>
            <p className="mt-1 text-ink-muted">Message us on WhatsApp at +91 89778 55998 or email contact@glowvai.in.</p>
          </div>
          <Link
            href="/contact"
            className="font-medium text-ink underline underline-offset-[5px] rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Contact us
          </Link>
        </div>
      </Section>
    </div>
  );
}
