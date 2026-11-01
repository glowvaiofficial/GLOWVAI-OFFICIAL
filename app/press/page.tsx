import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Download, Mail, Phone, ExternalLink, Sparkles, Shield, Award } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { emailFor } from "@/config/emails";
import { getAssetPath } from "@/lib/utils";

const DESC =
  "Official GLOW VAI Press & Media Center. Brand facts, founder biographies, high-resolution media assets, and media contact channels.";

export const metadata: Metadata = {
  title: "Press & Media Center | GLOW VAI",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/press` },
  openGraph: {
    title: "Press & Media Center | GLOW VAI",
    description: DESC,
    url: `${SITE_URL}/press`,
  },
};

const pressFacts = [
  { label: "Company", val: "GLOW VAI (Glow Vai Retail)" },
  { label: "Founded", val: "2025 in Vijayawada, AP" },
  { label: "Founding Team", val: "Sardar Musthafa (CEO), Nalla Satvik (Tech Lead), Rehmit (Marketing)" },
  { label: "Core Model", val: "30-second AI face scan + 15-min delivery" },
  { label: "Headquarters", val: "Vijayawada, Andhra Pradesh, India" },
  { label: "Coverage", val: "Tier-2 & Tier-3 urban centres in South India" },
];

const mediaAssets = [
  {
    title: "Official Brand Logos",
    desc: "Primary vector SVG and high-resolution transparent PNG logos (light & dark variants).",
    preview: "/logo/glowvai-logo.svg",
    isSvg: true,
    fileSize: "SVG / 512x512 PNG",
  },
  {
    title: "AI Face Scan Mockups",
    desc: "Clean captures of our 4-marker camera analysis and routine recommendations interface.",
    preview: "/images/face-analysis/camera_scan.png",
    isSvg: false,
    fileSize: "High-Res PNG (1200x800)",
  },
  {
    title: "Curated Routine Lineup",
    desc: "Studio packshots of our cleanser, active serum, daily moisturiser, and SPF 50 sunscreen.",
    preview: "/images/hero/skincare-studio-hero.jpg",
    isSvg: false,
    fileSize: "Full Resolution JPEG",
  },
  {
    title: "Founding Team Headshots",
    desc: "Official editorial portraits of Sardar Musthafa, Nalla Satvik, and Rehmit.",
    preview: "/images/founders/nalla-satvik.jpg",
    isSvg: false,
    fileSize: "Print-ready portraits",
  },
];

export default function PressPage() {
  const mail = emailFor("press");

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="md" labelledBy="press-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Press & Media</Eyebrow>
            <h1
              id="press-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
            >
              The story of <span className="text-brand">accessible skin science.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[50ch]">
              GLOW VAI is the Indian skincare brand redefining routine discovery. We combine on-device smartphone diagnostic intelligence with hyperlocal 15-minute doorstep delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={`mailto:${mail}?subject=Media Inquiry: GLOW VAI`}>
                <Button variant="primary" size="lg">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                  <span>Contact Press Team</span>
                </Button>
              </a>
              <Link href="/press/brand-kit" className={`inline-flex items-center gap-2 font-medium underline underline-offset-4 rounded ${focusRing}`}>
                Download Brand Kit
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 shadow-sm">
              <h2 className="font-display font-semibold text-xl text-ink mb-4">Fast Facts</h2>
              <dl className="divide-y divide-ink/10">
                {pressFacts.map((f) => (
                  <div key={f.label} className="py-2.5 flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-ink-muted font-mono text-xs uppercase tracking-wider">{f.label}</dt>
                    <dd className="font-medium text-ink text-right">{f.val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </Section>

      {/* Brand Story & Mission */}
      <Section tone="deep" pad="tight" labelledBy="story-summary-title">
        <div className="max-w-[760px]">
          <Eyebrow>Our Narrative</Eyebrow>
          <SectionTitle id="story-summary-title" className="mt-2">
            Eliminating skincare guesswork for modern India
          </SectionTitle>
          <div className="mt-6 space-y-4 text-ink-muted text-base leading-relaxed">
            <p>
              For decades, shopping for skincare meant guessing in supermarket aisles or relying on confusing influencer sponsorships. Millions of Indian consumers waste money on harsh, mismatched formulas that trigger breakouts or barrier damage.
            </p>
            <p>
              GLOW VAI began when three founders in Vijayawada, Visakhapatnam, and Hyderabad asked: <em>What if your smartphone camera could analyze your skin barrier in 30 seconds, and your customized routine arrived at your door in 15 minutes?</em>
            </p>
            <p>
              By partnering with licensed neighbourhood pharmacies and building proprietary computer-vision models calibrated for South Asian climates and skin tones, GLOW VAI is democratizing personalized dermatology routines across Tier-2 and Tier-3 urban centres.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs">
            <Sparkles className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-display font-semibold text-xl text-ink">Zero Guesswork</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              4-marker diagnostics score Hydration, Texture, Tone, and Barrier Clarity without medical quiz fatigue.
            </p>
          </div>
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs">
            <Shield className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-display font-semibold text-xl text-ink">Clean Actives</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Every formula discloses full active percentages (Niacinamide 10%, Centella, Ceramide NP) without marketing hype.
            </p>
          </div>
          <div className="bg-white border border-ink/15 rounded-[20px] p-6 shadow-2xs">
            <Award className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-display font-semibold text-xl text-ink">15-Minute Fleet</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Dispatched directly from licensed partner pharmacies in Vijayawada with real-time route verification.
            </p>
          </div>
        </div>
      </Section>

      {/* Brand Assets & Media Kit */}
      <Section pad="md" labelledBy="assets-title">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <Eyebrow>Media Resources</Eyebrow>
            <SectionTitle id="assets-title" className="mt-2">Downloadable Brand Assets</SectionTitle>
          </div>
          <p className="text-sm text-ink-muted max-w-sm">
            High-resolution brand assets permitted for editorial use in print, online, and broadcast coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mediaAssets.map((asset) => (
            <div key={asset.title} className="bg-white border border-ink/15 rounded-[20px] overflow-hidden flex flex-col justify-between shadow-2xs">
              <div className="relative aspect-[16/10] bg-paper-deep border-b border-ink/10 flex items-center justify-center p-4">
                <Image
                  src={getAssetPath(asset.preview)}
                  alt={asset.title}
                  fill
                  sizes="320px"
                  className={asset.isSvg ? "object-contain p-6" : "object-cover"}
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink">{asset.title}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{asset.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-ink-light">{asset.fileSize}</span>
                  <a
                    href={getAssetPath(asset.preview)}
                    download
                    className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Media Contact & Boilerplate */}
      <Section tone="deep" pad="tight" labelledBy="media-contact-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <SectionTitle id="media-contact-title">Company Boilerplate</SectionTitle>
            <p className="text-sm text-ink-muted leading-relaxed">
              <em>Journalists may quote the following overview in reporting:</em>
            </p>
            <div className="p-5 rounded-[16px] bg-white border border-ink/15 text-sm text-ink leading-relaxed">
              &ldquo;GLOW VAI is an Indian quick-commerce skincare brand founded in Vijayawada, Andhra Pradesh. The company combines an on-device 30-second camera skin diagnostic engine with a 15-minute hyperlocal delivery model powered by licensed pharmacy dark stores. GLOW VAI provides everyday consumers with dermatologically calibrated, transparent skincare routines free of cosmetic guesswork.&rdquo;
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 space-y-5 shadow-2xs">
            <h3 className="font-display font-semibold text-2xl text-ink">Media Enquiries</h3>
            <p className="text-sm text-ink-muted">
              We provide journalist briefings, founder interviews, product sample kits, and regional commerce insights with same-day turnaround.
            </p>

            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-3 text-sm">
                <Mail className="w-5 h-5 text-brand shrink-0" />
                <a href={`mailto:${mail}`} className="font-semibold text-ink hover:text-brand underline underline-offset-4">
                  {mail}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="w-5 h-5 text-brand shrink-0" />
                <a href="tel:+918977855998" className="font-semibold text-ink hover:text-brand underline underline-offset-4">
                  +91 89778 55998
                </a>
              </li>
            </ul>

            <div className="pt-2">
              <a
                href={`mailto:${mail}?subject=Press Quote Request`}
                className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors ${focusRing}`}
              >
                <span>Request Founder Interview</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
