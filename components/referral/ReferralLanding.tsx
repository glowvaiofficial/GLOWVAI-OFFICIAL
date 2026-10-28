"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, Car, GraduationCap } from "lucide-react";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";

const PER_REFERRAL = 10;
const MILESTONE_AT = 100;
const MILESTONE_BONUS = 1000;

const visuals = [
  { img: "/images/referral/auto_poster.png", alt: "Seatback QR poster inside an auto", title: "Auto seatback QR poster", body: "Mount our QR poster inside your auto. Passengers scan and check their skin for free." },
  { img: "/images/referral/upi_payout.png", alt: "UPI settlement", title: "₹10 per verified referral", body: "Paid by UPI to Google Pay or PhonePe once the referral is verified." },
  { img: "/images/referral/campus_ambassador.png", alt: "Student campus QR badge", title: "College QR ID badge", body: "Campus ambassadors share their scan badge with classmates." },
  { img: "/images/referral/whatsapp_share.png", alt: "WhatsApp share link", title: "One-tap WhatsApp invites", body: "Send your personal referral link to friends and groups." },
  { img: "/images/referral/vijayawada_hubs.png", alt: "Vijayawada hub network", title: "Vijayawada hubs", body: "Benz Circle, Bus Stand and Kanuru stands connect to neighbourhood hubs." },
  { img: "/images/referral/milestone_bonus.png", alt: "Milestone bonus", title: "₹1,000 milestone bonus", body: "Reach 100 verified referrals in a month and earn an extra ₹1,000." },
];

const rules = [
  { n: "01", t: "Register", b: "Pick Auto Driver or Campus Ambassador and fill a short form." },
  { n: "02", t: "Share", b: "Use your QR code or WhatsApp link. Friends do a free face scan." },
  { n: "03", t: "Earn", b: "Each verified referral adds ₹10. Hit 100 in a month for the bonus." },
];

export function ReferralLanding({
  onDriver,
  onStudent,
  onLogin,
}: {
  onDriver: () => void;
  onStudent: () => void;
  onLogin: () => void;
}) {
  const [n, setN] = useState(60);
  const base = n * PER_REFERRAL;
  const bonus = n >= MILESTONE_AT ? MILESTONE_BONUS : 0;
  const pct = Math.min(100, Math.round((n / MILESTONE_AT) * 100));

  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="ref-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-end">
          <div className="lg:col-span-7">
            <Eyebrow>Partner referral network</Eyebrow>
            <h1
              id="ref-title"
              className="mt-4 font-display font-semibold text-[clamp(2.75rem,1.6rem+5.2vw,5.5rem)] leading-[0.98] tracking-[-0.035em]"
            >
              Share a free skin scan. <span className="text-brand">Get paid.</span>
            </h1>
            <p className="mt-7 text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.5] text-ink-muted max-w-[50ch]">
              Earn ₹{PER_REFERRAL} for every verified referral, plus a ₹{MILESTONE_BONUS.toLocaleString("en-IN")} bonus at {MILESTONE_AT} verified referrals in a month. Paid by UPI.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
              <Button variant="primary" size="lg" onClick={onDriver} className="w-full sm:w-auto">
                <Car className="w-5 h-5" aria-hidden="true" />
                <span>Join as Auto Driver</span>
              </Button>
              <Button variant="outline" size="lg" onClick={onStudent} className="w-full sm:w-auto">
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
                <span>Join as Campus Ambassador</span>
              </Button>
            </div>
            <button
              type="button"
              onClick={onLogin}
              className={`mt-5 inline-flex items-center gap-2 font-medium underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
            >
              Already registered? Log in
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Interactive earnings estimate */}
          <div className="lg:col-span-5 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
            <Eyebrow>Estimate your month</Eyebrow>
            <p className="mt-3 font-display font-semibold text-6xl leading-none [font-feature-settings:'tnum']">
              ₹{(base + bonus).toLocaleString("en-IN")}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {n} verified referral{n === 1 ? "" : "s"} × ₹{PER_REFERRAL}
              {bonus ? ` + ₹${MILESTONE_BONUS.toLocaleString("en-IN")} bonus` : ""}
            </p>
            <label htmlFor="ref-count" className="mt-6 block text-sm font-semibold">
              Verified referrals in a month
            </label>
            <input
              id="ref-count"
              type="range"
              min={0}
              max={200}
              step={5}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className={`mt-2 w-full accent-[#1447E6] rounded ${focusRing}`}
            />
            <div className="mt-4 h-2 rounded-[3px] bg-ink/10 overflow-hidden" role="progressbar" aria-label="Progress to the bonus" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-ink-muted">
              {bonus ? "Bonus reached." : `${MILESTONE_AT - n} more for the ₹${MILESTONE_BONUS.toLocaleString("en-IN")} bonus.`} Example only, not a guarantee.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="deep" pad="tight" labelledBy="ref-how">
        <SectionTitle id="ref-how">Three steps.</SectionTitle>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
          {rules.map((r) => (
            <li key={r.n} className="border-t-2 border-ink pt-4">
              <p className="font-mono text-xs tracking-[0.12em] text-ink-muted">{r.n}</p>
              <h3 className="mt-3 font-display font-semibold text-2xl">{r.t}</h3>
              <p className="mt-2 text-ink-muted">{r.b}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="ref-visuals">
        <Eyebrow>How it looks on the ground</Eyebrow>
        <SectionTitle id="ref-visuals" className="mt-4 max-w-[22ch]">
          Posters, badges and links.
        </SectionTitle>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {visuals.map((v, i) => (
            <li key={v.title}>
              <div className="relative aspect-[4/3] rounded-[10px] overflow-hidden border border-ink/15 bg-paper-deep">
                <Image src={v.img} alt={v.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              </div>
              <p className="mt-3 font-mono text-xs tracking-[0.12em] text-ink-muted">0{i + 1}</p>
              <h3 className="font-display font-semibold text-xl">{v.title}</h3>
              <p className="mt-1 text-[15px] text-ink-muted">{v.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="ink" pad="md" labelledBy="ref-join">
        <SectionTitle id="ref-join" tone="dark" className="max-w-[20ch]">
          Ready to become a partner?
        </SectionTitle>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[820px]">
          <button
            type="button"
            onClick={onDriver}
            className="text-left border border-white/30 rounded-[10px] p-6 hover:bg-white/10 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Car className="w-6 h-6" aria-hidden="true" />
            <p className="mt-3 font-display font-semibold text-2xl">Auto Driver</p>
            <p className="mt-1 text-white/80 text-[15px]">Put our QR poster in your auto.</p>
            <p className="mt-4 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
              Register <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </p>
          </button>
          <button
            type="button"
            onClick={onStudent}
            className="text-left border border-white/30 rounded-[10px] p-6 hover:bg-white/10 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <GraduationCap className="w-6 h-6" aria-hidden="true" />
            <p className="mt-3 font-display font-semibold text-2xl">Campus Ambassador</p>
            <p className="mt-1 text-white/80 text-[15px]">Share your badge on campus.</p>
            <p className="mt-4 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
              Register <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </p>
          </button>
        </div>
      </Section>
    </div>
  );
}
