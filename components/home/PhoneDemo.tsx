"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Bike, ScanLine, ShoppingBag, CreditCard, Wifi, BatteryFull, RotateCcw, Phone } from "lucide-react";
import { getAssetPath } from "@/lib/utils";
import { routineProducts } from "@/config/home-content";

const steps = [
  { id: "scan", label: "Face scan", Icon: ScanLine },
  { id: "order", label: "Order", Icon: ShoppingBag },
  { id: "pay", label: "Payment", Icon: CreditCard },
  { id: "deliver", label: "Delivery", Icon: Bike },
] as const;

const payOptions = ["UPI", "Card", "Cash on delivery"];

const btn =
  "w-full rounded-[12px] bg-brand text-white text-[15px] font-semibold py-3.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";

type ScreenProps = { go: (i: number) => void };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Face scan: runs by itself, then shows a result ---------- */
function ScanScreen({ go }: ScreenProps) {
  const [pct, setPct] = useState(0);
  const done = pct >= 100;

  useEffect(() => {
    if (done) return;
    if (prefersReducedMotion()) {
      setPct(100);
      return;
    }
    const t = setInterval(() => setPct((p) => Math.min(100, p + 4)), 90);
    return () => clearInterval(t);
  }, [done]);

  return (
    <div className="relative w-full h-full bg-white flex flex-col">
      <div className="relative flex-1 min-h-0">
        <Image
          src={getAssetPath("/images/hero/face-scan-selfie.webp")}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 60vw, 320px"
          className="object-cover"
        />
        {!done && (
          <>
            <svg aria-hidden="true" viewBox="0 0 200 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 70 V50 a8 8 0 0 1 8 -8 H52" />
                <path d="M148 42 H168 a8 8 0 0 1 8 8 V70" />
                <path d="M24 290 V310 a8 8 0 0 0 8 8 H52" />
                <path d="M148 318 H168 a8 8 0 0 0 8 -8 V290" />
              </g>
            </svg>
            <div aria-hidden="true" className="gv-scan-line" />
          </>
        )}
      </div>
      <div className="px-4 pt-3 pb-5 bg-white">
        {!done ? (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-ink">Scanning your skin</p>
              <p className="font-mono text-xs text-ink-muted">{pct}%</p>
            </div>
            <div className="mt-2 h-1.5 rounded-[3px] bg-ink/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Scan progress">
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Sample result</p>
                <p className="font-display font-semibold text-4xl leading-none text-ink">84</p>
              </div>
              <div className="text-right text-[11px] text-ink-muted space-y-0.5">
                <p>
                  Hydration <span className="font-semibold text-ink">92%</span>
                </p>
                <p>
                  Oil balance <span className="font-semibold text-ink">71%</span>
                </p>
              </div>
            </div>
            <button type="button" onClick={() => go(1)} className={`${btn} mt-3`}>
              See my routine
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 2. Order ---------- */
function OrderScreen({ go }: ScreenProps) {
  const items = routineProducts.slice(0, 3);
  const [on, setOn] = useState<boolean[]>(items.map(() => true));
  const count = on.filter(Boolean).length;
  return (
    <div className="w-full h-full bg-white px-4 pb-5 flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-display font-semibold text-ink text-lg">Your routine</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">Tap to edit</p>
      </div>
      <ul className="flex-1 min-h-0 flex flex-col gap-2">
        {items.map((p, i) => (
          <li key={p.slug} className="flex-1 min-h-0">
            <button
              type="button"
              aria-pressed={on[i]}
              onClick={() => setOn(on.map((v, j) => (j === i ? !v : v)))}
              className={`w-full h-full flex items-center gap-3 rounded-[12px] border p-2 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand ${on[i] ? "border-brand bg-paper" : "border-ink/15 opacity-60"}`}
            >
              <div className="relative h-full aspect-square shrink-0 rounded-[8px] bg-white overflow-hidden">
                <Image src={getAssetPath(p.image)} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">{p.step}</p>
                <p className="text-[13px] font-semibold text-ink leading-tight line-clamp-2">{p.name}</p>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on[i] ? "bg-brand text-white" : "border-2 border-ink/30"}`}>
                {on[i] && <Check className="w-3 h-3" aria-hidden="true" />}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">Deliver to: Vijayawada</p>
      <button type="button" onClick={() => go(2)} disabled={count === 0} className={btn}>
        Continue to payment ({count})
      </button>
    </div>
  );
}

/* ---------- 3. Payment ---------- */
function PayScreen({ go }: ScreenProps) {
  const [sel, setSel] = useState(0);
  const [upi, setUpi] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok">("idle");

  useEffect(() => {
    if (state === "busy") {
      const t = setTimeout(() => setState("ok"), 1200);
      return () => clearTimeout(t);
    }
    if (state === "ok") {
      const t = setTimeout(() => go(3), 1100);
      return () => clearTimeout(t);
    }
  }, [state, go]);

  if (state !== "idle") {
    return (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center text-center px-6 gap-3">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${state === "ok" ? "bg-brand text-white" : "border-4 border-ink/15 border-t-brand animate-spin"}`}
        >
          {state === "ok" && <Check className="w-8 h-8" aria-hidden="true" />}
        </div>
        <p className="font-display font-semibold text-ink text-lg">{state === "ok" ? "Order confirmed" : "Processing payment"}</p>
        <p className="text-xs text-ink-muted">{state === "ok" ? "Sending a rider to you" : "Please wait"}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white px-4 pb-5 flex flex-col gap-2.5">
      <p className="font-display font-semibold text-ink text-lg">Choose how to pay</p>
      <ul className="flex-1 min-h-0 flex flex-col gap-2">
        {payOptions.map((o, i) => (
          <li key={o} className="flex-1 min-h-0">
            <button
              type="button"
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
              className={`w-full h-full flex items-center justify-between rounded-[12px] border px-3.5 text-[15px] font-semibold text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand ${sel === i ? "border-brand bg-paper" : "border-ink/15"}`}
            >
              {o}
              <span className={`w-5 h-5 rounded-full border-2 ${sel === i ? "border-brand bg-brand" : "border-ink/30"}`} />
            </button>
          </li>
        ))}
      </ul>
      {sel === 0 && (
        <input
          type="text"
          inputMode="email"
          aria-label="UPI ID"
          placeholder="yourname@upi"
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
          className="w-full rounded-[12px] border border-ink/20 px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-light focus:outline focus:outline-[3px] focus:outline-brand"
        />
      )}
      <button type="button" onClick={() => setState("busy")} className={btn}>
        Pay and confirm
      </button>
    </div>
  );
}

/* ---------- 4. Delivery: live map, countdown, delivered ---------- */
const route: [number, number][] = [
  [40, 185],
  [40, 120],
  [110, 120],
  [110, 50],
  [170, 50],
];
const segLens = route.slice(1).map((pt, i) => Math.hypot(pt[0] - route[i][0], pt[1] - route[i][1]));
const routeLen = segLens.reduce((a, b) => a + b, 0);

// Rider position plus the already-travelled part of the route, for progress p in [0, 1].
function ride(p: number) {
  let d = p * routeLen;
  const covered: [number, number][] = [route[0]];
  for (let i = 0; i < segLens.length; i++) {
    if (d <= segLens[i]) {
      const t = d / segLens[i];
      const pos: [number, number] = [
        route[i][0] + (route[i + 1][0] - route[i][0]) * t,
        route[i][1] + (route[i + 1][1] - route[i][1]) * t,
      ];
      covered.push(pos);
      return { pos, covered };
    }
    d -= segLens[i];
    covered.push(route[i + 1]);
  }
  return { pos: route[route.length - 1], covered };
}

function DeliverScreen({ go }: ScreenProps) {
  const START = 15;
  const [eta, setEta] = useState(START);
  const delivered = eta <= 0;

  useEffect(() => {
    if (delivered) return;
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), prefersReducedMotion() ? 250 : 700);
    return () => clearInterval(t);
  }, [delivered]);

  const { pos, covered } = ride((START - eta) / START);
  const stage = delivered ? 2 : eta > 10 ? 0 : 1;
  const labels = ["Packed", "On the way", "At your door"];

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="relative flex-1 min-h-0 bg-[#EFEBE3]">
        <svg viewBox="0 0 200 220" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="#E2DCCF">
            <rect x="48" y="58" width="56" height="56" rx="3" />
            <rect x="118" y="58" width="46" height="56" rx="3" />
            <rect x="48" y="128" width="56" height="50" rx="3" />
            <rect x="0" y="128" width="34" height="50" rx="3" />
            <rect x="118" y="0" width="76" height="44" rx="3" />
          </g>
          <rect x="118" y="128" width="76" height="50" rx="3" fill="#D6E6D1" />
          <g stroke="#fff" strokeWidth="9" fill="none">
            <path d="M0 50 H200 M0 120 H200 M0 185 H200 M40 0 V220 M110 0 V220 M170 0 V220" />
          </g>
          <polyline
            points={route.map((r) => r.join(",")).join(" ")}
            fill="none"
            stroke="#1447E6"
            strokeOpacity="0.3"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 7"
          />
          <polyline points={covered.map((r) => r.join(",")).join(" ")} fill="none" stroke="#1447E6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="31" y="176" width="18" height="18" rx="4" fill="#12161F" />
          <circle cx="170" cy="50" r="10" fill="#1447E6" />
          <circle cx="170" cy="50" r="4" fill="#fff" />
          <circle cx={pos[0]} cy={pos[1]} r="8" fill="#fff" stroke="#1447E6" strokeWidth="3" />
          <circle cx={pos[0]} cy={pos[1]} r="3" fill="#1447E6" />
        </svg>
        <p className="absolute bottom-1.5 left-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted bg-white/90 rounded px-1.5">Partner store</p>
        <p className="absolute top-[22%] right-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted bg-white/90 rounded px-1.5">You</p>
      </div>

      <div className="px-4 pt-3 pb-5 flex flex-col gap-3 bg-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{delivered ? "Status" : "Arriving in"}</p>
            <p className="font-display font-semibold text-ink leading-none text-[40px]">
              {delivered ? (
                "Delivered"
              ) : (
                <>
                  {eta}
                  <span className="text-base font-medium text-ink-muted"> min</span>
                </>
              )}
            </p>
          </div>
          {delivered ? (
            <button
              type="button"
              onClick={() => setEta(START)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-[10px] border border-ink/20 text-[13px] font-semibold text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Replay
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="w-9 h-9 rounded-full bg-paper-deep flex items-center justify-center text-ink">
                <Phone className="w-4 h-4" aria-hidden="true" />
              </span>
              Your rider
            </div>
          )}
        </div>
        <ol className="grid grid-cols-3 gap-1.5">
          {labels.map((t, i) => (
            <li key={t}>
              <span className={`block h-1.5 rounded-[3px] ${i <= stage ? "bg-brand" : "bg-ink/15"}`} />
              <span className={`mt-1 block text-[10px] leading-tight ${i === stage ? "text-ink font-semibold" : "text-ink-muted"}`}>{t}</span>
            </li>
          ))}
        </ol>
        {delivered && (
          <button type="button" onClick={() => go(0)} className={btn}>
            Scan again
          </button>
        )}
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
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 6500);
    return () => clearInterval(t);
  }, [auto]);

  const go = (i: number) => {
    setAuto(false);
    setActive(i);
  };
  const Screen = screens[active];

  return (
    <div className="flex flex-col items-center">
      {/* Handset: graphite frame, side keys, island, status bar, home bar */}
      <div className="relative h-[min(560px,calc(100svh-290px))] min-h-[440px] aspect-[9/18.5] rounded-[46px] bg-[#16181D] p-[9px] ring-1 ring-black/40">
        <span aria-hidden="true" className="absolute -left-[3px] top-[96px] w-[3px] h-8 rounded-l bg-[#2A2D35]" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[142px] w-[3px] h-12 rounded-l bg-[#2A2D35]" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[120px] w-[3px] h-16 rounded-r bg-[#2A2D35]" />
        <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-white flex flex-col" aria-live="polite">
          <div aria-hidden="true" className="absolute top-0 inset-x-0 h-11 z-20 flex items-center justify-between px-6 text-[12px] font-semibold text-ink pointer-events-none">
            <span className="bg-white/70 rounded px-1">9:41</span>
            <span className="flex items-center gap-1 bg-white/70 rounded px-1">
              <Wifi className="w-3.5 h-3.5" />
              <BatteryFull className="w-4 h-4" />
            </span>
          </div>
          <div aria-hidden="true" className="absolute top-2 left-1/2 -translate-x-1/2 w-[84px] h-[24px] rounded-full bg-black z-30" />
          <div className={`flex-1 min-h-0 ${active === 1 || active === 2 ? "pt-12" : ""}`}>
            <Screen key={active} go={go} />
          </div>
          <div aria-hidden="true" className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-ink/40 z-20" />
        </div>
      </div>

      <div role="tablist" aria-label="How GLOW VAI works, on a phone" className="mt-4 flex flex-wrap justify-center gap-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => go(i)}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-[10px] border text-[13px] font-semibold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand ${
              i === active ? "bg-brand border-brand text-white" : "bg-white border-ink/20 text-ink hover:border-ink"
            }`}
          >
            <s.Icon className="w-4 h-4" aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">Illustration of the flow. Try it.</p>
    </div>
  );
}
