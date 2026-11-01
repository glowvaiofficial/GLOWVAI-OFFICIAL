/**
 * GLOW VAI UTM Campaign & Attribution Tracker.
 * Manages first-touch and last-touch attribution in sessionStorage.
 */

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
}

export function captureUtmParameters(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const utmTerm = searchParams.get("utm_term");
    const ref = searchParams.get("ref");

    const currentParams: UtmParams = {};
    if (utmSource) currentParams.utm_source = utmSource.substring(0, 100);
    if (utmMedium) currentParams.utm_medium = utmMedium.substring(0, 100);
    if (utmCampaign) currentParams.utm_campaign = utmCampaign.substring(0, 100);
    if (utmContent) currentParams.utm_content = utmContent.substring(0, 100);
    if (utmTerm) currentParams.utm_term = utmTerm.substring(0, 100);
    if (ref) {
      currentParams.ref = ref.substring(0, 100);
      if (!currentParams.utm_campaign) {
        currentParams.utm_campaign = "glowcard-share";
      }
    }

    if (Object.keys(currentParams).length > 0) {
      // Store in sessionStorage as last touch
      sessionStorage.setItem("gv_utm_params", JSON.stringify(currentParams));

      // Store first touch if not already present
      if (!sessionStorage.getItem("gv_utm_first_touch")) {
        sessionStorage.setItem("gv_utm_first_touch", JSON.stringify(currentParams));
      }
    }

    const stored = sessionStorage.getItem("gv_utm_params");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem("gv_utm_params");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}
