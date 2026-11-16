"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { captureUtmParameters } from "@/lib/analytics/utm";
import { isCookieNoticeHidden, isShopPath } from "@/lib/consent/notice";

/**
 * GLOW VAI Basic Consent Mode Banner.
 * Rules:
 * - Shows on first visit.
 * - Does not block main UI CTA.
 * - Equal weight buttons: "Accept analytics" and "No thanks".
 * - Saved in localStorage as gv_consent.
 * - Provides window event gv_open_cookie_settings for footer re-triggering.
 */

export interface ConsentState {
  analytics: boolean;
  version: number;
  ts: number;
}

export function CookieNotice() {
  const [showBanner, setShowBanner] = useState(false);
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const visible = showBanner && !isCookieNoticeHidden(pathname);

  // While the bar is visible the page reserves the space it covers (see .gv-consent-open in globals.css), so it never
  // sits on top of the last lines or buttons of a page. Removed again when the choice is saved.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const apply = () => {
      const h = barRef.current?.getBoundingClientRect().height ?? 0;
      root.style.setProperty("--gv-consent-h", `${Math.ceil(h)}px`);
    };
    root.setAttribute("data-gv-consent-open", "");
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.removeAttribute("data-gv-consent-open");
      root.style.removeProperty("--gv-consent-h");
    };
  }, [visible]);

  useEffect(() => {
    // Capture UTM parameters into sessionStorage on load
    captureUtmParameters();

    try {
      const raw = localStorage.getItem("gv_consent");
      if (!raw) {
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }

    const handleReopen = () => setShowBanner(true);
    window.addEventListener("gv_open_cookie_settings", handleReopen);
    return () => window.removeEventListener("gv_open_cookie_settings", handleReopen);
  }, []);

  const updateConsent = (analyticsGranted: boolean) => {
    const consentState: ConsentState = {
      analytics: analyticsGranted,
      version: 1,
      ts: Date.now(),
    };

    try {
      localStorage.setItem("gv_consent", JSON.stringify(consentState));
    } catch (err) {
      console.error("Failed to save consent state:", err);
    }

    setShowBanner(false);

    // Update window gtag consent
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: analyticsGranted ? "granted" : "denied",
      });
    }

    // Dispatch event for GA4Script listener
    window.dispatchEvent(new CustomEvent("gv_consent_updated", { detail: consentState }));
  };

  // The rider page is a work tool: the banner would cover the deliveries. Partners see it on other pages.
  // Rider and vendor pages never show the notice (see lib/consent/notice.ts). Their analytics
  // follow the choice already saved on the shop, which GA4Script reads on mount.
  if (!showBanner || isCookieNoticeHidden(pathname)) return null;

  return (
    <div
      ref={barRef}
      role="dialog"
      aria-label="Privacy and analytics choice"
      className="gv-consent-banner fixed bottom-24 md:bottom-4 left-3 right-[76px] sm:right-auto z-[60] sm:w-[360px] bg-white text-ink border border-ink/15 rounded-[14px] md:rounded-[24px] p-2 md:p-5 shadow-[0_8px_24px_rgba(10,27,77,.10)] max-md:flex max-md:items-center max-md:gap-2"
    >
      <div className="max-md:min-w-0 max-md:flex-1">
      <h2 className={`${isShopPath(pathname) ? "" : "font-display "}font-semibold text-sm md:text-base text-ink max-md:sr-only`}>Analytics, your choice</h2>
      <p className="md:mt-1.5 text-xs md:text-sm leading-snug md:leading-relaxed text-ink-muted line-clamp-2 md:line-clamp-none">
        We use analytics to see which pages help people. We never send your name, phone, email or photos.{" "}
        <Link href="/privacy#cookies" className="gv-link-inline text-brand underline underline-offset-[3px] font-medium">
          Privacy policy
        </Link>
        .
      </p>
      </div>
      <div className="max-md:flex max-md:shrink-0 max-md:gap-1.5 md:mt-4 md:grid md:grid-cols-2 md:gap-3">
        <button
          id="btn-accept-analytics"
          onClick={() => updateConsent(true)}
          className="min-h-11 px-3 md:px-4 rounded-[10px] border-[1.5px] border-ink/25 bg-white text-ink text-[0.9375rem] font-semibold hover:border-ink transition-colors cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Accept
        </button>
        <button
          id="btn-decline-analytics"
          onClick={() => updateConsent(false)}
          className="min-h-11 px-3 md:px-4 rounded-[10px] border-[1.5px] border-ink/25 bg-white text-ink text-[0.9375rem] font-semibold hover:border-ink transition-colors cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("gv_open_cookie_settings"))}
      className="text-xs text-slate-400 hover:text-blue-400 underline transition-colors focus:outline-none"
    >
      Cookie settings
    </button>
  );
}
