"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Bike, ScanLine, ShoppingBag, CreditCard } from "lucide-react";
import { getAssetPath } from "@/lib/utils";
import { routineProducts } from "@/config/home-content";

const steps = [
  { id: "scan", label: "Face scan", Icon: ScanLine },
  { id: "order", label: "Order", Icon: ShoppingBag },
  { id: "pay", label: "Payment", Icon: CreditCard },
  { id: "deliver", label: "Delivery", Icon: Bike },
] as const;

const payOptions = ["UPI", "Card", "Cash on delivery"];

function ScanScreen() {
  return (
    <div className="relative w-full h-full bg-white">
      <Image
        src={getAssetPath("/images/hero/face-scan-selfie.webp")}
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 60vw, 320px"
        className="object-cover"
      />
      <svg aria-hidden="true" viewBox="0 0 200 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 70 V50 a8 8 0 0 1 8 -8 H52" />
          <path d="M148 42 H168 a8 8 0 0 1 8 8 V70" />
          <path d="M24 290 V310 a8 8 0 0 0 8 8 H52" />
          <path d="M148 318 H168 a8 8 0 0 0 8 -8 V290" />
        </g>
      </svg>
      <div aria-hidden="true" className="gv-scan-line" />
      <div className="absolute inset-x-0 bottom-0 p-4 bg-white">
        <p className="font-mono text-xs text-ink-muted mb-2">Scanning your skin</p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-[3px] ${i < 2 ? "bg-brand" : "bg-ink/15"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderScreen() {
  return (
    <div className="w-full h-full bg-white pt-9 px-3.5 pb-3 flex flex-col">
      <p className="font-display font-semibold text-ink text-sm">Your routine</p>
      <ul className="mt-2 space-y-2 flex-1 overflow-hidden">
        {routineProducts.slice(0, 3).map((p) => (
          <li key={p.slug} className="flex items-center gap-2.5 border border-ink/15 rounded-[10px] p-2">
            <div className="relative w-10 h-10 shrink-0 rounded-md bg-paper overflow-hidden">
              <Image src={getAssetPath(p.image)} alt="" fill sizes="40px" className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">{p.step}</p>
              <p className="text-[11px] font-semibold text-ink leading-tight line-clamp-2">{p.name}</p>
            </div>
            <Check className="w-4 h-4 text-brand ml-auto shrink-0" aria-hidden="true" />
          </li>
        ))}
      </ul>
      <div className="mt-2 rounded-[10px] bg-brand text-white text-center text-sm font-semibold py-2.5">Place order</div>
    </div>
  );
}

function PayScreen() {
  return (
    <div className="w-full h-full bg-white pt-9 px-3.5 pb-3 flex flex-col">
      <p className="font-display font-semibold text-ink text-sm">Choose how to pay</p>
      <ul className="mt-3 space-y-2 flex-1">
        {payOptions.map((o, i) => (
          <li
            key={o}
            className={`flex items-center justify-between rounded-[10px] border px-3 py-3 text-[13px] font-semibold text-ink ${
              i === 0 ? "border-brand bg-paper" : "border-ink/15"
            }`}
          >
            {o}
            <span className={`w-4 h-4 rounded-full border-2 ${i === 0 ? "border-brand bg-brand" : "border-ink/30"}`} />
          </li>
        ))}
      </ul>
      <div className="rounded-[10px] bg-brand text-white text-center text-sm font-semibold py-2.5">Pay and confirm</div>
    </div>
  );
}

function DeliverScreen() {
  return (
    <div className="w-full h-full bg-white pt-9 px-3.5 pb-3 flex flex-col">
      <p className="font-display font-semibold text-ink text-sm">Out for delivery</p>
      <div className="mt-4 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center">
          <Bike className="w-8 h-8" aria-hidden="true" />
        </div>
        <p className="mt-3 font-display font-semibold text-4xl text-ink leading-none">~15</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mt-1">minutes, estimate</p>
      </div>
      <ol className="space-y-1.5 text-[11px] text-ink">
        {["Order packed", "Rider on the way", "At your door"].map((t, i) => (
          <li key={t} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${i < 2 ? "bg-brand" : "bg-ink/20"}`} />
            {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

const screens = [ScanScreen, OrderScreen, PayScreen, DeliverScreen];

export function PhoneDemo() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 4000);
    return () => clearInterval(t);
  }, [auto]);

  const Screen = screens[active];

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-[58%] min-[480px]:w-[min(280px,60%)] lg:w-[min(320px,66%)] aspect-[9/19] rounded-[40px] border-8 border-brand bg-brand">
        <div aria-hidden="true" className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[90px] h-[22px] rounded-full bg-brand z-20" />
        <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-white" aria-live="polite">
          <Screen />
        </div>
      </div>
      <div role="tablist" aria-label="How GLOW VAI works, on a phone" className="mt-5 flex flex-wrap justify-center gap-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => {
              setAuto(false);
              setActive(i);
            }}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-[10px] border text-[13px] font-semibold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand ${
              i === active ? "bg-brand border-brand text-white" : "bg-white border-ink/20 text-ink hover:border-ink"
            }`}
          >
            <s.Icon className="w-4 h-4" aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">Illustration of the flow. Tap a step.</p>
    </div>
  );
}
