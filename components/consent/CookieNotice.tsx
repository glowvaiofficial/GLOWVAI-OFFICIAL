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
      aria-label="Privacy and Cookie Notice"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 shadow-2xl transition-all animate-fade-in"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 pr-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
            Privacy and Analytics Consent
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We use analytics to see which pages help people. We never send your name, phone, email, or photos. Learn more in our{" "}
            <Link href="/privacy#cookies" className="text-blue-400 hover:text-blue-300 underline font-medium">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            id="btn-accept-analytics"
            onClick={() => updateConsent(true)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 text-center min-h-[44px]"
          >
            Accept analytics
          </button>
          <button
            id="btn-decline-analytics"
            onClick={() => updateConsent(false)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all active:scale-95 text-center min-h-[44px]"
          >
            No thanks
          </button>
        </div>
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
