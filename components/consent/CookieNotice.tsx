"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { captureUtmParameters } from "@/lib/analytics/utm";

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

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy and analytics choice"
      className="fixed bottom-24 md:bottom-4 left-4 right-4 sm:right-auto z-[60] sm:w-[360px] bg-white text-ink border border-ink/15 rounded-[24px] p-5 shadow-[0_8px_24px_rgba(10,27,77,.10)]"
    >
      <h2 className="font-display font-semibold text-base text-ink">Analytics, your choice</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        We use analytics to see which pages help people. We never send your name, phone, email or photos.{" "}
        <Link href="/privacy#cookies" className="text-brand underline underline-offset-[3px] font-medium">
          Privacy policy
        </Link>
        .
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          id="btn-accept-analytics"
          onClick={() => updateConsent(true)}
          className="min-h-11 px-4 rounded-[10px] border-[1.5px] border-ink/25 bg-white text-ink text-[0.9375rem] font-semibold hover:border-ink transition-colors cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Accept
        </button>
        <button
          id="btn-decline-analytics"
          onClick={() => updateConsent(false)}
          className="min-h-11 px-4 rounded-[10px] border-[1.5px] border-ink/25 bg-white text-ink text-[0.9375rem] font-semibold hover:border-ink transition-colors cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
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
