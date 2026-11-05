// CORS for the vendor API. The native app sends no Origin header and is always allowed (it authenticates with a
// Firebase ID token, not cookies). Browsers are allowed only from VENDOR_WEB_ORIGINS (comma list), plus the Expo web
// dev servers outside production. Never "*", and never Allow-Credentials: the API uses bearer tokens only.

export const DEV_ORIGINS = ["http://localhost:8081", "http://localhost:19006"];

export type OriginCheck = { kind: "none" } | { kind: "allowed"; origin: string } | { kind: "denied" };

const normalise = (o: string) => o.trim().replace(/\/+$/, "").toLowerCase();

export function allowedOrigins(env: { VENDOR_WEB_ORIGINS?: string; NODE_ENV?: string }): string[] {
  const list = String(env.VENDOR_WEB_ORIGINS ?? "")
    .split(",")
    .map(normalise)
    .filter((o) => /^https?:\/\/[^\s/]+$/.test(o));
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
