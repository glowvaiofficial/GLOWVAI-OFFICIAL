"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { TAGLINE_ART } from "@/config/hero-art";
import { getAssetPath } from "@/lib/utils";

// The tagline moment: one large statement, further down the page. Each word starts muted and turns to full colour, one at a time,
// as it crosses a line two thirds of the way down the screen. Reveals once. With reduced motion the words are full colour at once.
const TEXT =
  "Skincare shopping should not be guesswork. Scan your face, see what your skin is asking for, and get a routine that fits, at your door in about 15 minutes.";

export function TaglineReveal() {
  const words = useMemo(() => TEXT.split(" "), []);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter((e): e is HTMLSpanElement => !!e);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((e) => e.setAttribute("data-on", "1"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting || en.boundingClientRect.top < 0) {
            en.target.setAttribute("data-on", "1");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -34% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-labelledby="tagline-title" className="relative isolate overflow-hidden bg-[#FAF2E1]">
      <div className="relative z-10 gv-page py-16 sm:py-20 lg:py-36">
        <p id="tagline-title" className="font-display font-semibold text-[clamp(2rem,1rem+3.3vw,3.75rem)] leading-[1.12] tracking-[-0.025em] text-ink max-w-[600px] [text-wrap:balance]">
          {words.map((w, i) => (
            <React.Fragment key={i}>
              <span ref={(el) => { refs.current[i] = el; }} className="gv-word">{w}</span>{" "}
            </React.Fragment>
          ))}
        </p>
      </div>
      <div className="relative h-[280px] sm:h-[380px] lg:absolute lg:inset-0 lg:h-auto -z-0" aria-hidden={false}>
        <Image src={getAssetPath(TAGLINE_ART.src)} alt={TAGLINE_ART.alt} fill sizes="100vw" className="object-cover [object-position:78%_50%]" />
        <div aria-hidden="true" className="absolute inset-0 lg:hidden bg-gradient-to-b from-[#FAF2E1] via-transparent to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: "linear-gradient(90deg, #FAF2E1 0%, rgba(250,242,225,0.95) 30%, rgba(250,242,225,0.55) 48%, rgba(250,242,225,0) 64%)" }} />
      </div>
    </section>
  );
}
