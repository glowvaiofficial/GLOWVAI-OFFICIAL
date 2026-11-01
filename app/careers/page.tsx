import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Briefcase, Sparkles, Zap, Heart, CheckCircle2, MapPin, Clock } from "lucide-react";
import { SITE_URL } from "@/lib/site-url";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { emailFor } from "@/config/emails";
import { getAssetPath } from "@/lib/utils";

const DESC =
  "Join GLOW VAI in Andhra Pradesh. We are building the future of algorithmic skin diagnosis and 15-minute skincare delivery.";

export const metadata: Metadata = {
  title: "Careers at GLOW VAI | Join Our Team in Andhra Pradesh",
  description: DESC,
  alternates: { canonical: `${SITE_URL}/careers` },
  openGraph: {
    title: "Careers at GLOW VAI | Join Our Team in Andhra Pradesh",
    description: DESC,
    url: `${SITE_URL}/careers`,
  },
};

const roles = [
  {
    dept: "Engineering & AI",
    title: "Full-Stack Engineer (Next.js & Cloud)",
    type: "Full-time",
    loc: "Vijayawada / Hybrid",
    summary:
      "Help build our sub-30-second AI diagnostic engine, real-time rider tracking, and ultra-fast storefront.",
    skills: ["TypeScript", "Next.js 16", "Node.js", "Tailwind CSS", "Firebase/PostgreSQL"],
  },
  {
    dept: "Engineering & AI",
    title: "Computer Vision & ML Specialist",
    type: "Full-time / Contract",
    loc: "Vijayawada / Remote",
    summary:
      "Train, prune, and deploy lightweight on-device ONNX face analysis models calibrated for Indian skin tones and diverse lighting.",
    skills: ["Python", "PyTorch/TensorFlow", "ONNX Runtime", "Computer Vision", "WebGL/WebAssembly"],
  },
  {
    dept: "Growth & Marketing",
    title: "Campus & Community Growth Lead",
    type: "Full-time",
    loc: "Vijayawada, AP",
    summary:
      "Scale our campus ambassador network across engineering and degree colleges in Andhra Pradesh, driving authentic word-of-mouth adoption.",
    skills: ["Community Building", "Campus Activations", "Vernacular Telugu/English Campaigns", "Referral Loops"],
  },
  {
    dept: "Operations & Logistics",
    title: "Hyperlocal Dispatch & Dark Store Manager",
    type: "Full-time",
    loc: "Vijayawada, AP",
    summary:
      "Oversee local pharmacy partner inventory, rider dispatch speed, and 15-minute SLA fulfillment across Vijayawada hubs.",
    skills: ["Fleet Operations", "Inventory Audits", "Pharmacy Partner Relations", "Routing SLAs"],
  },
  {
    dept: "Customer Happiness",
    title: "Derm-Trained Skincare Advisor",
    type: "Full-time",
    loc: "Vijayawada, AP",
    summary:
      "Guide users through their skin scan reports, answering active ingredient and routine compatibility queries via WhatsApp in Telugu and English.",
    skills: ["Cosmetic Dermatology Basics", "Bilingual Telugu/English", "Customer Empathy", "Active Ingredients"],
  },
];

const perks = [
  {
    Icon: Zap,
    title: "Zero Bureaucracy",
    body: "Work directly with founders Sardar Musthafa, Nalla Satvik, and Rehmit. Ship ideas directly into production.",
  },
  {
    Icon: Sparkles,
    title: "Real-World Impact",
    body: "Solve authentic consumer pain points by eliminating skincare guesswork for real people in Tier-2 & Tier-3 India.",
  },
  {
    Icon: Heart,
    title: "Competitive Compensation & Equity",
    body: "Market-rate salaries, early team equity allocations, performance bonuses, and annual health coverage.",
  },
  {
    Icon: Briefcase,
    title: "Free Skincare Allowance",
    body: "Monthly product allowances to test and enjoy the exact skincare routines and clean formulas we curate.",
  },
];

export default function CareersPage() {
  const mail = emailFor("careers");

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <Section pad="md" labelledBy="careers-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Join GLOW VAI</Eyebrow>
            <h1
              id="careers-hero"
              className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]"
            >
              Build the future of <span className="text-brand">quick-commerce skincare.</span>
            </h1>
            <p className="mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[52ch]">
              We pair 30-second camera skin diagnostics with 15-minute doorstep delivery in Andhra Pradesh. We are a fast-moving, high-conviction team looking for craft-focused builders.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#open-roles">
                <Button variant="primary" size="lg">
                  <span>View Open Roles</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Button>
              </a>
              <Link href="/our-story" className={`inline-flex items-center gap-2 font-medium underline underline-offset-4 rounded ${focusRing}`}>
                Read our founder story
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-ink/15 shadow-sm bg-paper-deep">
              <Image
                src={getAssetPath("/images/story-ai/lab.png")}
                alt="GLOW VAI team and skincare research"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Why Work With Us */}
      <Section tone="deep" pad="tight" labelledBy="why-title">
        <div className="max-w-[720px] mb-12">
          <Eyebrow>Our Culture</Eyebrow>
          <SectionTitle id="why-title" className="mt-2">Why build at GLOW VAI?</SectionTitle>
          <p className="mt-4 text-ink-muted text-lg">
            We are building tech from Vijayawada that touches everyday lives across Andhra Pradesh. Here is what you can expect working with us.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((p) => {
            const Icon = p.Icon;
            return (
              <div key={p.title} className="bg-white border border-ink/15 rounded-[20px] p-6 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-12 h-12 rounded-[12px] bg-paper-deep border border-ink/10 flex items-center justify-center text-brand mb-5">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Open Roles */}
      <Section id="open-roles" pad="md" labelledBy="roles-title">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <Eyebrow>Current Openings</Eyebrow>
            <SectionTitle id="roles-title" className="mt-2">Open Positions</SectionTitle>
          </div>
          <p className="text-sm text-ink-muted max-w-sm">
            Don&apos;t see your exact profile? Send an open pitch to <a href={`mailto:${mail}`} className="text-brand underline">{mail}</a>.
          </p>
        </div>

        <div className="space-y-4">
          {roles.map((r) => (
            <div
              key={r.title}
              className="bg-white border border-ink/15 rounded-[20px] p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-brand/50 transition-all shadow-2xs"
            >
              <div className="space-y-2 max-w-[680px]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold px-2.5 py-0.5 rounded-[6px] bg-brand/10">
                    {r.dept}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-ink-light">
                    <Clock className="w-3.5 h-3.5" /> {r.type}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-ink-light">
                    <MapPin className="w-3.5 h-3.5" /> {r.loc}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-2xl text-ink">{r.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{r.summary}</p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {r.skills.map((s) => (
                    <span key={s} className="font-mono text-[11px] px-2 py-0.5 rounded-[6px] bg-paper-deep text-ink-muted border border-ink/10">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <a
                  href={`mailto:${mail}?subject=Application: ${encodeURIComponent(r.title)}`}
                  className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[10px] bg-ink text-white font-semibold text-sm hover:bg-brand transition-colors ${focusRing}`}
                >
                  <span>Apply for Role</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Application Process */}
      <Section tone="deep" pad="tight" labelledBy="process-title">
        <SectionTitle id="process-title">Our 4-step hiring process</SectionTitle>
        <p className="mt-3 text-ink-muted max-w-xl">
          We respect your time. From first application to final decision, our process typically takes less than 7 days.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { n: "01", t: "Send CV & Note", d: "Email careers@glowvai.in with your resume and 2 sentences on what you love building." },
            { n: "02", t: "Intro Call (25 min)", d: "A fast conversation with founders to align on mission, role expectations, and mutual fit." },
            { n: "03", t: "Hands-on Challenge", d: "A practical take-home task mirroring real work (no algorithmic puzzle hazing)." },
            { n: "04", t: "Offer & Welcome", d: "Clear compensation offer, equity paperwork, and fast onboarding in Andhra Pradesh." },
          ].map((s) => (
            <div key={s.n} className="border-t-2 border-ink pt-4">
              <span className="font-mono text-sm text-brand font-semibold">{s.n}</span>
              <h3 className="mt-2 font-display font-semibold text-xl text-ink">{s.t}</h3>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white border border-ink/15 rounded-[20px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-semibold text-2xl text-ink">Ready to talk?</h3>
            <p className="text-sm text-ink-muted mt-1">Send your portfolio or CV directly to our founding team.</p>
          </div>
          <a
            href={`mailto:${mail}?subject=General Career Inquiry`}
            className={`inline-flex items-center justify-center gap-2 min-h-[50px] px-8 rounded-[10px] bg-brand text-white font-semibold text-base hover:bg-brand-dark transition-colors ${focusRing}`}
          >
            <span>Email careers@glowvai.in</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </Section>
    </div>
  );
}
