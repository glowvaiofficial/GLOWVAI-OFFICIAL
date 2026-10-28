export * from "./analytics/index";

export type AnalyticsEvent =
  | { name: "scan_form_view" }
  | { name: "scan_form_submit"; ageConfirmed?: boolean; demographic?: string }
  | { name: "scan_camera_open" }
  | { name: "scan_camera_denied" }
  | { name: "scan_complete"; scoreBand: "low" | "mid" | "high" }
  | { name: "scan_retake" }
  | { name: "scan_drop_off"; step: string }
  | { name: "scan_cta_click"; location: string };

export function trackEvent(event: AnalyticsEvent) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics Event]: ${event.name}`, event);
  }

  if (typeof window !== "undefined" && (window as unknown as { gtag?: Function }).gtag) {
    (window as unknown as { gtag: Function }).gtag("event", event.name, event);
  }
}
