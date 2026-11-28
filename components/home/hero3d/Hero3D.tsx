"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { getAssetPath } from "@/lib/utils";

// The 3D chunk (three.js) loads only when the browser is idle, the hero is on screen, WebGL works, and the person has not asked
// for less motion or less data. Until then (and on every device that cannot run it) the CSS fallback below is shown, so the hero is
// never empty and the page text and buttons never wait for 3D.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Nav = Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const FALLBACK = [
  { src: "/images/products/serum-1.png", alt: "", cls: "left-[34%] top-[18%] w-[34%] z-20", delay: "0s" },
  { src: "/images/products/moisturiser-1.png", alt: "", cls: "left-[62%] top-[48%] w-[30%] z-30", delay: "-2s" },
  { src: "/images/products/cleanser-1.png", alt: "", cls: "left-[4%] top-[42%] w-[30%] z-10", delay: "-4s" },
  { src: "/images/products/sunscreen-1.png", alt: "", cls: "left-[52%] top-[6%] w-[24%] z-10", delay: "-1s" },
];

export function Hero3D({ tone = "light" }: { tone?: "light" | "dark" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"checking" | "static" | "3d">("checking");
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nav = navigator as Nav;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    const lowData = nav.connection?.saveData === true || /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
    const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
    if (lowData || weak || !webglOk()) {
      setMode("static");
      return;
    }
    // Start 3D only when the browser is idle, so the text, buttons and page finish first.
    const start = () => setMode("3d");
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(start, { timeout: 1800 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(start, 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setVisible((v) => (document.hidden ? false : v));
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrap} aria-hidden="true" className="relative isolate w-full max-w-[560px] mx-auto aspect-square select-none">
      {/* Soft light behind everything (light tone only: the dark hero paints its own glow) */}
      {tone === "light" ? (
        <div
          className="absolute inset-[-6%] -z-10 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(20,71,230,0.30), rgba(124,245,200,0.22) 55%, rgba(255,255,255,0) 76%)" }}
        />
      ) : null}

      {/* Fallback: product photos floating in CSS. Fades out once the 3D scene has drawn its first frame. */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        {FALLBACK.map((p) => (
          <div
            key={p.src}
            className={`absolute aspect-square ${p.cls} gv-float rounded-[22px] ${tone === "dark" ? "bg-white/12 ring-1 ring-white/25" : "bg-white/70 ring-1 ring-ink/[0.06]"} shadow-card backdrop-blur-sm overflow-hidden`}
            style={{ animationDelay: p.delay }}
          >
            <Image src={getAssetPath(p.src)} alt={p.alt} fill sizes="(max-width: 640px) 40vw, 200px" className="object-contain p-2" priority={p.src.includes("serum")} />
          </div>
        ))}
      </div>

      {mode === "3d" && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          style={tone === "light" ? { WebkitMaskImage: "radial-gradient(closest-side, #000 84%, transparent 100%)", maskImage: "radial-gradient(closest-side, #000 84%, transparent 100%)" } : undefined}
        >
          <Scene animate={!reduced} active={visible} tone={tone} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
