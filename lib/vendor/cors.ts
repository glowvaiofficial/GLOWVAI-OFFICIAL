// CORS for the vendor API. The native app sends no Origin header and is always allowed (it authenticates with a
// Firebase ID token, not cookies). Browsers are allowed only from VENDOR_WEB_ORIGINS (comma list), plus the Expo web
// dev servers outside production. The site's own origins (NEXT_PUBLIC_SITE_URL, glowvai.in, www.glowvai.in) are always
// allowed, so the vendor pages need no env var. Never "*", and never Allow-Credentials: the API uses bearer tokens only.

export const DEV_ORIGINS = ["http://localhost:8081", "http://localhost:19006"];

export type OriginCheck = { kind: "none" } | { kind: "allowed"; origin: string } | { kind: "denied" };

const normalise = (o: string) => o.trim().replace(/\/+$/, "").toLowerCase();

/** The site's own origins, so the vendor pages on the site can call the API with no env var set. */
export const SITE_ORIGINS = ["https://glowvai.in", "https://www.glowvai.in"];

/** The origin of NEXT_PUBLIC_SITE_URL, or nothing if it is missing or not a URL. */
function siteOriginFrom(siteUrl: string | undefined): string[] {
  if (!siteUrl || !siteUrl.trim()) return [];
  try {
    return [new URL(siteUrl.trim()).origin.toLowerCase()];
  } catch {
    return [];
  }
}

export function allowedOrigins(env: { VENDOR_WEB_ORIGINS?: string; NODE_ENV?: string; NEXT_PUBLIC_SITE_URL?: string }): string[] {
  const list = [...siteOriginFrom(env.NEXT_PUBLIC_SITE_URL), ...SITE_ORIGINS];
  list.push(
    ...String(env.VENDOR_WEB_ORIGINS ?? "")
      .split(",")
      .map(normalise)
      .filter((o) => /^https?:\/\/[^\s/]+$/.test(o)),
  );
  if (env.NODE_ENV !== "production") list.push(...DEV_ORIGINS);
  return [...new Set(list)];
}

export function checkOrigin(origin: string | null | undefined, allowed: string[]): OriginCheck {
  if (!origin) return { kind: "none" };
  const o = normalise(origin);
  return allowed.includes(o) ? { kind: "allowed", origin: origin.trim().replace(/\/+$/, "") } : { kind: "denied" };
}

export function corsHeaders(check: OriginCheck): Record<string, string> {
  const base: Record<string, string> = { Vary: "Origin" };
  if (check.kind !== "allowed") return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": check.origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
  };
}
