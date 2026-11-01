"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, Eyebrow, SectionTitle, focusRing } from "./shared";
import { serviceablePincodes } from "@/config/serviceablePincodes";
import { submitPublicForm } from "@/lib/forms/submit";
import { getAssetPath } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { deliverySteps } from "@/config/home-content";

type Status = "idle" | "available" | "unavailable" | "invalid" | "pending-list";

const inputClass =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

// Brand graphic: a minute dial with the first 15 minutes marked. Drawn for GLOW VAI.
function MinuteDial({ minute }: { minute: number }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" className="w-full max-w-[220px]">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke="#12161F" strokeWidth="2" />
      <path d="M100 100 L100 12 A88 88 0 0 1 188 100 Z" fill="#1447E6" />
      {ticks.map((i) => {
        const long = i % 5 === 0;
        const a = (i / 60) * Math.PI * 2;
        const r1 = long ? 78 : 83;
        return (
          <line
            key={i}
            x1={100 + Math.sin(a) * r1}
            y1={100 - Math.cos(a) * r1}
            x2={100 + Math.sin(a) * 90}
            y2={100 - Math.cos(a) * 90}
            stroke={i < 15 ? "#fff" : "#12161F"}
            strokeWidth={long ? 2 : 1}
          />
        );
      })}
      <line x1="100" y1="100" x2="100" y2="22" stroke="#12161F" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minute * 6} 100 100)`} />
      <circle cx="100" cy="100" r="5" fill="#12161F" />
    </svg>
  );
}

const deliveryStepImages = [
  { src: "/images/home-ai/products_shelf.png", alt: "Pick a matched skincare routine" },
  { src: "/images/home-ai/vendor_store.png", alt: "Partner store packing order fresh" },
  { src: "/images/home-ai/express_delivery.png", alt: "Rider dispatched immediately" },
  { src: "/glowvai/assets/onboarding/hero-delivery-v2.png", alt: "Doorstep delivery in 15 minutes" },
];

export function DeliverySection() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [contact, setContact] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [minute, setMinute] = useState(14);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      track("pincode_check", { result: "invalid" });
      setStatus("invalid");
      document.getElementById("pincode")?.focus();
      return;
    }
    if (serviceablePincodes.length === 0) {
      track("pincode_check", { result: "not_serviceable" });
      setStatus("pending-list");
      return;
    }
    const ok = serviceablePincodes.includes(pincode);
    track("pincode_check", { result: ok ? "serviceable" : "not_serviceable" });
    setStatus(ok ? "available" : "unavailable");
  };

  const handleWaitlist = async () => {
    if (!contact.trim()) return;
    setBusy(true);
    const value = contact.trim();
    await submitPublicForm("Waitlist", {
      email: value.includes("@") ? value : "",
      pincode,
      source: value.includes("@") ? "delivery-section" : `delivery-section phone:${value.replace(/[^\d+]/g, "")}`,
      consent: "yes",
    });
    setBusy(false);
    setWaitlistDone(true);
  };

  return (
    <Section id="delivery" tone="deep" labelledBy="delivery-title" pad="open">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12">
        <div className="lg:col-span-5">
          <p
            aria-hidden="true"
            className="font-display font-semibold text-[clamp(8rem,5rem+14vw,15rem)] leading-[0.78] tracking-[-0.06em] text-ink [font-feature-settings:'tnum']"
          >
            15
          </p>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-ink-muted">minutes, about</p>
          <div className="mt-8 flex items-end gap-5">
            <MinuteDial minute={minute} />
            <p className="pb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
              Example
              <br />
              <span className="text-ink text-base">about {minute} min</span>
            </p>
          </div>
          <label htmlFor="minute-range" className="mt-5 block font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
            Drag to move the clock hand
          </label>
          <input
            id="minute-range"
            type="range"
            min={1}
            max={15}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className={`mt-2 w-full max-w-[320px] accent-[#1447E6] rounded ${focusRing}`}
          />
          <div className="mt-10 grid grid-cols-2 gap-4">
            <figure className="space-y-2">
              <div className="relative aspect-[4/3] rounded-[10px] overflow-hidden border border-ink/15 bg-paper">
                <Image
                  src={getAssetPath("/images/home-ai/express_delivery.png")}
                  alt="A rider carrying a skincare order"
                  fill
                  sizes="(max-width: 1024px) 45vw, 300px"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-[13px] text-ink-light">Illustration</figcaption>
            </figure>
            <figure className="space-y-2">
              <div className="relative aspect-[4/3] rounded-[10px] overflow-hidden border border-ink/15 bg-paper">
                <Image
                  src={getAssetPath("/images/home-ai/vendor_store.png")}
                  alt="A partner store counter with skincare products"
                  fill
                  sizes="(max-width: 1024px) 45vw, 300px"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-[13px] text-ink-light">Illustration</figcaption>
            </figure>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Eyebrow>How it reaches you</Eyebrow>
          <SectionTitle id="delivery-title" className="mt-4">
            From a store near you to your door.
          </SectionTitle>
          <p className="mt-5 text-ink-muted max-w-[56ch]">
            Orders are packed at partner stores in Vijayawada and sent by rider. Delivery time depends on distance,
            traffic and stock.
          </p>

          <ol className="mt-8 border-t border-ink/20">
            {deliverySteps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-4 py-3.5 border-b border-ink/20">
                <div className="relative w-14 h-14 shrink-0 rounded-[10px] bg-paper-deep border border-ink/15 overflow-hidden">
                  <Image
                    src={getAssetPath(deliveryStepImages[i].src)}
                    alt={deliveryStepImages[i].alt}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-ink/80 text-white font-mono text-[9px] px-1 py-0.5 rounded-[3px]">
                    0{i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-lg text-ink leading-tight">{s.title}</h3>
                  <p className="text-[14px] text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/delivery"
            className={`mt-5 inline-flex items-center gap-2 font-medium text-ink underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
          >
            <span>See delivery details</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>

          <form onSubmit={handleCheck} className="mt-10 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8" noValidate>
            <h3 className="font-display font-semibold text-xl text-ink">Check your pincode</h3>
            <p className="mt-1 text-[15px] text-ink-muted">Find out if delivery reaches you.</p>
            <label htmlFor="pincode" className="mt-5 block text-sm font-semibold text-ink">
              6-digit pincode
            </label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                id="pincode"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="postal-code"
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, ""));
                  setStatus("idle");
                }}
                placeholder="520001"
                aria-invalid={status === "invalid"}
                aria-describedby="pincode-result"
                className={inputClass}
              />
              <Button type="submit" variant="primary" size="md" className="sm:shrink-0">
                <span>Check availability</span>
              </Button>
            </div>

            <div id="pincode-result" aria-live="polite" className="mt-3 min-h-6 text-[15px]">
              {status === "available" && <p className="font-semibold text-[#0B5C3B]">Delivery is available in your area.</p>}
              {status === "invalid" && <p className="text-[#9B1C1C]">Enter a 6-digit pincode.</p>}
              {(status === "unavailable" || status === "pending-list") && (
                <div className="space-y-3">
                  <p className="text-ink-muted">
                    {status === "pending-list"
                      ? `We are still adding delivery areas. Leave your number and we will tell you if we deliver to ${pincode}.`
                      : "Not available here yet. Leave your number and we will tell you when we arrive."}
                  </p>
                  {waitlistDone ? (
                    <p className="font-semibold text-ink">Thanks. We will be in touch.</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label htmlFor="waitlist-contact" className="sr-only">
                        Phone number or email
                      </label>
                      <input
                        id="waitlist-contact"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="Phone number or email"
                        className={inputClass}
                      />
                      <Button type="button" onClick={handleWaitlist} disabled={busy} variant="outline" size="md" className="sm:shrink-0">
                        <span>{busy ? "Sending..." : "Notify me"}</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-4 text-[13px] text-ink-light">
              Delivery times are estimates and can vary with traffic, weather and stock.
            </p>
          </form>

          
        </div>
      </div>
    </Section>
  );
}
