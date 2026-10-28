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
  const items = routineProducts.slice(0, 3);
  const [on, setOn] = useState<boolean[]>(items.map(() => true));
  const [placed, setPlaced] = useState(false);
  const count = on.filter(Boolean).length;
  return (
    <div className="w-full h-full bg-white pt-10 px-3.5 pb-3.5 flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-display font-semibold text-ink text-base">Your routine</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">Tap to edit</p>
      </div>
      <ul className="flex-1 flex flex-col gap-2.5">
        {items.map((p, i) => (
          <li key={p.slug} className="flex-1">
            <button
              type="button"
              aria-pressed={on[i]}
              onClick={() => { setPlaced(false); setOn(on.map((v, j) => (j === i ? !v : v))); }}
              className={`w-full h-full flex items-center gap-3 rounded-[10px] border p-2.5 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand ${on[i] ? "border-brand bg-paper" : "border-ink/15 opacity-60"}`}
            >
              <div className="relative w-14 h-14 shrink-0 rounded-md bg-white overflow-hidden">
                <Image src={getAssetPath(p.image)} alt="" fill sizes="56px" className="object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">{p.step}</p>
                <p className="text-xs font-semibold text-ink leading-tight line-clamp-2">{p.name}</p>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on[i] ? "bg-brand text-white" : "border-2 border-ink/30"}`}>
                {on[i] && <Check className="w-3 h-3" aria-hidden="true" />}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setPlaced(true)}
        disabled={count === 0}
        className="rounded-[10px] bg-brand text-white text-sm font-semibold py-3 disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {placed ? "Order placed" : `Place order (${count} ${count === 1 ? "item" : "items"})`}
      </button>
    </div>
  );
}

function PayScreen() {
  const [sel, setSel] = useState(0);
  const [paid, setPaid] = useState(false);
  return (
    <div className="w-full h-full bg-white pt-10 px-3.5 pb-3.5 flex flex-col gap-2.5">
      <p className="font-display font-semibold text-ink text-base">Choose how to pay</p>
      <ul className="flex-1 flex flex-col gap-2.5">
        {payOptions.map((o, i) => (
          <li key={o} className="flex-1">
            <button
              type="button"
              aria-pressed={sel === i}
              onClick={() => { setPaid(false); setSel(i); }}
              className={`w-full h-full flex items-center justify-between rounded-[10px] border px-3.5 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand ${sel === i ? "border-brand bg-paper" : "border-ink/15"}`}
            >
              {o}
              <span className={`w-5 h-5 rounded-full border-2 ${sel === i ? "border-brand bg-brand" : "border-ink/30"}`} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setPaid(true)}
        className="rounded-[10px] bg-brand text-white text-sm font-semibold py-3 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {paid ? `Confirmed: ${payOptions[sel]}` : "Pay and confirm"}
      </button>
    </div>
  );
}

function DeliverScreen() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((x) => (x + 1) % 3), 1600);
    return () => clearInterval(t);
  }, []);
  const labels = ["Order packed", "Rider on the way", "At your door"];
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="relative flex-1 bg-paper-deep overflow-hidden">
        <svg viewBox="0 0 200 220" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g stroke="#fff" strokeWidth="9" fill="none">
            <path d="M0 50 H200 M0 120 H200 M0 185 H200 M40 0 V220 M110 0 V220 M170 0 V220" />
          </g>
          <path id="gv-route" d="M40 185 V120 H110 V50 H170" fill="none" stroke="#1447E6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8" />
          <rect x="32" y="177" width="16" height="16" rx="3" fill="#12161F" />
          <circle cx="170" cy="50" r="9" fill="#1447E6" />
          <circle cx="170" cy="50" r="3.5" fill="#fff" />
          <circle r="7" fill="#1447E6" stroke="#fff" strokeWidth="3">
            <animateMotion dur="6s" repeatCount="indefinite" path="M40 185 V120 H110 V50 H170" />
          </circle>
        </svg>
        <p className="absolute top-10 left-3.5 font-display font-semibold text-ink text-base">Out for delivery</p>
        <p className="absolute bottom-2 left-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">Partner store</p>
        <p className="absolute top-[72px] right-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">You</p>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-2.5">
        <div className="flex items-end justify-between">
          <p className="font-display font-semibold text-5xl text-ink leading-none">~15</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted pb-1">minutes, estimate</p>
        </div>
        <ol className="grid grid-cols-3 gap-1.5">
          {labels.map((t, i) => (
            <li key={t}>
              <span className={`block h-1.5 rounded-[3px] ${i <= stage ? "bg-brand" : "bg-ink/15"}`} />
              <span className={`mt-1 block text-[10px] leading-tight ${i === stage ? "text-ink font-semibold" : "text-ink-muted"}`}>{t}</span>
            </li>
          ))}
        </ol>
      </div>
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
