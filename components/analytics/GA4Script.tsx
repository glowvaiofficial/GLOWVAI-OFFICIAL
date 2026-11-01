"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { hasAnalyticsConsent } from "@/lib/analytics";

/**
 * GLOW VAI Consent-First GA4 Script Loader.
 * Rules:
 * - Default consent mode is set to 'denied' for ad_storage, ad_user_data, ad_personalization, analytics_storage.
 * - gtag script is loaded AFTER interactive ONLY if GA_ID is defined and consent is granted.
 */

export function GA4Script() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    setConsentGranted(hasAnalyticsConsent());

    const handleConsentChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.analytics === "boolean") {
        setConsentGranted(customEvent.detail.analytics);
      } else {
        setConsentGranted(hasAnalyticsConsent());
      }
    };

    window.addEventListener("gv_consent_updated", handleConsentChange);
    return () => window.removeEventListener("gv_consent_updated", handleConsentChange);
  }, []);

  if (!gaId || gaId === "G-XXXXXXXXXX" || !consentGranted) {
    return null;
  }

  return (
    <>
      <Script
        id="ga4-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'granted'
            });
          `,
        }}
      />
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              send_page_view: false,
              allow_google_signals: false,
              allow_ad_personalization_signals: false,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}
