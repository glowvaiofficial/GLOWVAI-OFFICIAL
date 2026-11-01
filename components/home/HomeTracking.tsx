"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import type { GA4EventName } from "@/config/analytics-events";

// One delegated listener set for the landing page. Server-rendered sections only
// add data-track attributes; no personal data is ever read or sent.
export function HomeTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest("[data-track]");
      if (!el) return;
      const params: Record<string, unknown> = {};
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("data-track-")) params[attr.name.slice("data-track-".length)] = attr.value;
      }
      track(el.getAttribute("data-track") as GA4EventName, params);
    };

    const onToggle = (e: Event) => {
      const el = e.target as HTMLDetailsElement;
      if (el?.tagName === "DETAILS" && el.open && el.dataset.faqId) {
        track("faq_open", { question_id: el.dataset.faqId });
      }
    };

    const fired = new Set<number>();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const pct = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
        for (const mark of [25, 50, 75, 100] as const) {
          if (pct >= mark - 1 && !fired.has(mark)) {
            fired.add(mark);
            track("scroll_depth", { percent: mark });
          }
        }
      });
    };

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const slug = (entry.target as HTMLElement).dataset.productSlug;
            if (slug) track("product_view", { product_slug: slug });
            io?.unobserve(entry.target);
          }
        },
        { threshold: 0.5 }
      );
      document.querySelectorAll("[data-product-slug]").forEach((n) => io?.observe(n));
    }

    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  return null;
}
