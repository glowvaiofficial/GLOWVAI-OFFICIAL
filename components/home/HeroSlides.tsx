"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { HeroSlide } from "@/config/hero-art";
import { getAssetPath } from "@/lib/utils";

// The hero pictures: they cross fade slowly with a gentle zoom. The first picture is loaded with the page; the others load once the
// browser is idle. The slideshow pauses when the hero is off screen, when the tab is hidden, on hover or keyboard focus, and it
// stays on the first picture for people who asked for reduced motion.
const SHADE_DESKTOP = "linear-gradient(90deg, rgba(5,12,43,0.88) 0%, rgba(8,28,99,0.62) 36%, rgba(8,28,99,0.12) 66%, rgba(8,28,99,0) 100%)";

export function HeroSlides({ slides, interval = 7500 }: { slides: HeroSlide[]; interval?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setArmed(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setArmed(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!armed || reduced || !visible || paused || slides.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => window.clearInterval(t);
  }, [armed, reduced, visible, paused, slides.length, interval]);

  return (
    <div
      ref={root}
      className="relative h-[46svh] min-h-[300px] overflow-hidden lg:absolute lg:inset-0 lg:h-auto lg:min-h-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        if (i > 0 && !armed) return null;
        const active = i === index;
        return (
          <div
            key={s.src}
            aria-hidden={!active}
            className="absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ opacity: active ? 1 : 0 }}
          >
            <Image
              src={getAssetPath(s.src)}
              alt={active ? s.alt : ""}
              fill
              priority={i === 0}
              sizes="100vw"
              className={`object-cover ${active && !reduced ? "gv-kenburns" : ""} [object-position:var(--pm)] lg:[object-position:var(--pd)]`}
              style={{ ["--pm" as string]: s.mobile, ["--pd" as string]: s.desktop }}
            />
          </div>
        );
      })}

      {/* Shade for the words: from the left on wide screens, a fade into the page colour under the picture on phones */}
      <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: SHADE_DESKTOP }} />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 lg:hidden bg-gradient-to-t from-[#081C63] to-transparent" />

      {slides.length > 1 ? (
        <div className="absolute z-20 right-4 bottom-4 lg:right-8 lg:bottom-8 flex items-center gap-2" role="group" aria-label="Hero pictures">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Show picture ${i + 1} of ${slides.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="h-11 w-6 flex items-center justify-center rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-white"
            >
              <span className={`block h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${i === index ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
