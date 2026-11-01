import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Store, Truck, Sparkles, Users, CheckCircle2, ShieldCheck, Mail, Phone, ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { emailFor } from "@/config/emails";
import { getAssetPath } from "@/lib/utils";

const DESC =
  "Partner with GLOW VAI as a retail pharmacy store, skincare brand, delivery rider, auto driver or campus ambassador across Andhra Pradesh.";

export const metadata: Metadata = {
  title: "Partner With GLOW VAI | Stores, Brands & Fleets",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/partners` },
  openGraph: {
    title: "Partner With GLOW VAI | Stores, Brands & Fleets",
    description: DESC,
    url: `${SITE_URL}/partners`,
  },
};

const tracks = [
  {
    id: "stores",
    Icon: Store,
    title: "Partner Stores & Pharmacies",
    tagline: "Turn your store counter into a 15-minute fulfillment dark store",
    summary:
      "Licensed pharmacies and beauty retailers in Vijayawada pack orders in under 2 minutes for our dispatched riders. Earn guaranteed per-order packing fees with zero customer acquisition overhead.",
    benefits: [
      "Guaranteed fulfillment commission per verified order",
      "Real-time order notification via WhatsApp & dedicated dashboard",
      "Immediate stock replenishment & inventory insurance",
      "Same-week direct bank or UPI settlements",
    ],
    requirements: "Valid Drug Licence / Retail GSTIN, smartphone for order alerts, dedicated clean storage shelf.",
    cta: "Join as Partner Store",
    subject: "Partner Store Application - Vijayawada",
  },
  {
    id: "brands",
    Icon: Sparkles,
    title: "Brands & Cosmetic Formulators",
    tagline: "Algorithmic routine matching with 15-minute doorstep dispatch",
    summary:
      "Get your cleansers, serums, and sunscreens matched directly to customers based on their 30-second smartphone skin scan. No shelf-slotting fees or middleman markups.",
    benefits: [
      "Direct recommendation to qualified skin profiles (e.g. Oily/Acne or Barrier-Damaged)",
      "15-minute ultra-fast customer delivery experience in Andhra Pradesh",
      "Transparent customer retention and repeat purchase analytics",
      "Zero hidden listing fees or predatory marketplace penalties",
    ],
    requirements: "CDSCO / AYUSH approval, complete active ingredient transparency, verified batch test records.",
    cta: "Submit Brand Catalogue",
    subject: "Brand Listing & Distribution Proposal",
  },
  {
    id: "riders",
    Icon: Truck,
    title: "Delivery Fleet Network",
    tagline: "Fast 2–5 km radius deliveries with transparent payouts",
    summary:
      "Deliver skincare packages from neighbourhood pharmacy hubs to customer doorsteps in Vijayawada. Flexible morning or evening shifts with weekly payouts.",
    benefits: [
      "Transparent per-delivery rates + weekly milestone bonus incentives",
      "Short 2 to 5 km delivery radii centered around Vijayawada hubs",
      "Lightweight packages (skincare bottles & tubes, no heavy groceries)",
      "Daily fuel support & rider transit insurance",
    ],
    requirements: "Two-wheeler with valid registration, driving licence, and Android/iOS smartphone.",
    cta: "Sign Up to Deliver",
    subject: "Rider Fleet Registration - Vijayawada",
  },
  {
    id: "ambassadors",
    Icon: Users,
    title: "Campus Ambassadors & Auto Rickshaws",
    tagline: "Earn ₹10 per verified skin scan + ₹1,000 monthly bonus",
    summary:
      "Auto drivers mount QR seatback posters so passengers check their skin during commutes. College students share their personal QR scan code across campus networks.",
    benefits: [
      "₹10 paid instantly via UPI (GPay / PhonePe) per verified completed scan",
      "₹1,000 extra cash bonus on reaching 100 scans in a month",
      "Free laminated QR seatback posters & lanyard badges provided",
      "Zero product selling or inventory handling required",
    ],
    requirements: "Active auto-rickshaw permit in Vijayawada or valid college student ID card.",
    cta: "Join Referral Program",
    link: "/referral",
  },
];

export default function PartnersPage() {
  const mail = emailFor("partners");

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="md" labelledBy="partners-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Partner Ecosystem</Eyebrow>
            <h1
              id="partners-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
            >
              Grow with <span className="text-brand">GLOW VAI.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[50ch]">
              Whether you operate a licensed pharmacy in Vijayawada, manufacture clinical skincare formulas, or drive in our delivery network, we offer transparent, profitable partnership models.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#partner-tracks">
                <Button variant="primary" size="lg">
                  <span>Explore Partnership Tracks</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Button>
              </a>
              <Link href="/referral" className={`inline-flex items-center gap-2 font-medium underline underline-offset-4 rounded ${focusRing}`}>
                Auto Driver & Campus Referral Portal
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-ink/15 shadow-sm bg-paper-deep">
              <Image
                src={getAssetPath("/images/home-ai/vendor_store.png")}
                alt="GLOW VAI partner store counter"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* 4 Partnership Tracks */}
      <Section id="partner-tracks" tone="deep" pad="md" labelledBy="tracks-title">
        <div className="max-w-[720px] mb-12">
          <Eyebrow>How to collaborate</Eyebrow>
          <SectionTitle id="tracks-title" className="mt-2">Choose your partnership path</SectionTitle>
          <p className="mt-4 text-ink-muted text-lg">
            Every partnership track is designed with clear incentives, fast onboarding, and prompt weekly payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {tracks.map((track) => {
            const Icon = track.Icon;
            return (
              <div
                key={track.id}
                className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-brand/40 transition-all"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-[14px] bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-2xl text-ink leading-tight">{track.title}</h3>
                      <p className="font-mono text-xs uppercase tracking-wider text-ink-light mt-0.5">{track.tagline}</p>
                    </div>
                  </div>

                  <p className="text-sm text-ink-muted leading-relaxed mt-4">{track.summary}</p>

                  <div className="mt-6 border-t border-ink/10 pt-4">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-brand font-semibold mb-3">Key Benefits</h4>
                    <ul className="space-y-2">
                      {track.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-ink-muted">
                          <CheckCircle2 className="w-4 h-4 text-[#0B5C3B] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 p-3.5 rounded-[12px] bg-paper border border-ink/10 text-xs text-ink-muted">
                    <span className="font-semibold text-ink">Requirement: </span>
                    {track.requirements}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-ink/10">
                  {track.link ? (
                    <Link
                      href={track.link}
                      className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-ink text-white font-semibold text-sm hover:bg-brand transition-colors ${focusRing}`}
                    >
                      <span>{track.cta}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={`mailto:${mail}?subject=${encodeURIComponent(track.subject || track.title)}`}
                      className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors ${focusRing}`}
                    >
                      <span>{track.cta}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Direct Contact & Support */}
      <Section pad="md" labelledBy="partner-inquiry-title">
        <div className="bg-white border border-ink/15 rounded-[24px] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-sm">
          <div className="lg:col-span-8 space-y-3">
            <h2 id="partner-inquiry-title" className="font-display font-semibold text-3xl text-ink">
              Speak directly with our partnership leads
            </h2>
            <p className="text-ink-muted text-base max-w-xl">
              We review commercial proposals, store location feasibility, and brand catalogues within 24 working hours.
            </p>
            <div className="pt-2 flex flex-wrap gap-6 text-sm text-ink-muted">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand" /> {mail}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand" /> +91 89778 55998
              </span>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-3">
            <a
              href={`mailto:${mail}?subject=Partnership Proposal`}
              className={`inline-flex items-center justify-center gap-2 min-h-[52px] px-8 rounded-[10px] bg-brand text-white font-semibold text-base hover:bg-brand-dark transition-colors ${focusRing}`}
            >
              <span>Email partners@glowvai.in</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
