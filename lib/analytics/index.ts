import { BANNED_ANALYTICS_KEYS, GA4EventName, ALLOWED_EVENT_NAMES } from "@/config/analytics-events";

/**
 * GLOW VAI Privacy-Preserving GA4 Event Sanitizer and Client Tracker.
 * Rules:
 * - Drops any parameter listed in BANNED_ANALYTICS_KEYS.
 * - Scrubs string values containing email patterns, phone patterns (7+ digits), or credential URLs.
 * - Truncates strings to 100 characters max.
 * - Respects user consent (reads localStorage gv_consent).
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{7,15}\b/g;

export function sanitizeParamValue(value: unknown): unknown {
  if (typeof value === "string") {
    let clean = value.replace(EMAIL_REGEX, "[REDACTED_EMAIL]").replace(PHONE_REGEX, "[REDACTED_PHONE]");
    if (clean.length > 100) {
      clean = clean.substring(0, 100);
    }
    return clean;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeParamValue);
  }
  if (value !== null && typeof value === "object") {
    return sanitizeParams(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (BANNED_ANALYTICS_KEYS.includes(lowerKey as any)) {
      continue; // Drop banned PII key
    }
    sanitized[key] = sanitizeParamValue(val);
  }

  return sanitized;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("gv_consent");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

export function track<T extends GA4EventName>(
  eventName: T,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (!ALLOWED_EVENT_NAMES.has(eventName)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[GA4 WARNING]: Event '${eventName}' is not in the allowed catalog.`);
    }
    return;
  }

  if (!hasAnalyticsConsent()) {
    return; // Silent no-op when consent is denied
  }

  const cleanParams = params ? sanitizeParams(params) : {};

  try {
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, cleanParams);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[GA4 TRACK ERROR]:", err);
    }
  }
}
