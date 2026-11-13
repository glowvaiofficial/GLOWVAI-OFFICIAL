// The one wrapper every /api/rider route uses, so each route runs the same checks in the same order:
// secret configured -> same-origin and JSON for writes -> IP limit -> session and active partner -> partner limit ->
// body -> the route's own work. Responses are JSON with Cache-Control: no-store. Unexpected errors are logged by route
// name only and answered with a generic message.
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, overLimit } from "@/lib/shop/server";
import { SITE_URL } from "@/lib/site-url";
import { RiderError } from "./errors";
import { riderFrom, type RiderPartner } from "./auth";
import { RIDER_COOKIE, RIDER_COOKIE_OPTIONS, riderSecret } from "./session";

export interface Limit {
  max: number;
  windowMs: number;
}

export interface RiderCtx<P> {
  req: NextRequest;
  partner: RiderPartner | null;
  params: P;
  body: Record<string, unknown>;
}

export type Cookie = { value: string } | { clear: true } | undefined;

export interface Outcome {
  status?: number;
  body: Record<string, unknown>;
  cookie?: Cookie;
}

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 4096;

/** Writes must come from this site: the Origin header has to match, and the browser must not call it cross-site. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const allowed = new Set<string>([new URL(req.url).origin]);
  try {
    if (SITE_URL) allowed.add(new URL(SITE_URL).origin);
  } catch {
    // A malformed SITE_URL leaves only the request's own origin allowed.
  }
  return allowed.has(origin);
}

export function isJsonRequest(req: NextRequest): boolean {
  return (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new RiderError("PAYLOAD_TOO_LARGE", 413, "That request is too large.");
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) throw new RiderError("PAYLOAD_TOO_LARGE", 413, "That request is too large.");
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RiderError("INVALID_INPUT", 400, "Send the request details as JSON.");
  return parsed as Record<string, unknown>;
}

function applyCookie(res: NextResponse, cookie: Cookie) {
  if (!cookie) return;
  if ("clear" in cookie) res.cookies.set(RIDER_COOKIE, "", { ...RIDER_COOKIE_OPTIONS, maxAge: 0 });
  else res.cookies.set(RIDER_COOKIE, cookie.value, RIDER_COOKIE_OPTIONS);
}

export interface RouteOptions {
  route: string;
  /** POST routes that change something: same-origin and JSON are required. */
  write: boolean;
  /** Requires a rider session. Sign-in and logout do not. */
  auth: boolean;
  /** Per IP, for every caller of this route. */
  ip?: Limit;
  /** Per signed-in partner. */
  partner?: Limit;
  /** Count ip and partner limits in the shared limiter (Upstash when configured). Off unless a route asks for it. */
  shared?: boolean;
}

export function riderRoute<P extends Record<string, string> = Record<string, never>>(
  opts: RouteOptions,
  work: (ctx: RiderCtx<P>) => Promise<Outcome>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      riderSecret();
      if (opts.write) {
        if (!sameOrigin(req)) throw new RiderError("ORIGIN_BLOCKED", 403, "This request was blocked. Reload the page and try again.");
        if (!isJsonRequest(req)) throw new RiderError("CONTENT_TYPE", 415, "Send the request as JSON.");
      }
      if (opts.ip && (await overLimit(`ip:rider-${opts.route}:${clientIp(req)}`, opts.ip.max, opts.ip.windowMs, opts.shared === true))) {
        throw new RiderError("RATE_LIMITED", 429, "Too many requests. Please wait a moment and try again.", Math.ceil(opts.ip.windowMs / 1000));
      }
      const partner = opts.auth ? await riderFrom(req) : null;
      if (opts.auth && !partner) throw new RiderError("UNAUTHENTICATED", 401, "Sign in to continue.");
      if (partner && opts.partner && (await overLimit(`partner:rider-${opts.route}:${partner.id}`, opts.partner.max, opts.partner.windowMs, opts.shared === true))) {
        throw new RiderError("RATE_LIMITED", 429, "Too many requests. Please wait a moment and try again.", Math.ceil(opts.partner.windowMs / 1000));
      }
      const body = opts.write ? await readBody(req) : {};
      const params = ((await context?.params) ?? {}) as P;
      const out = await work({ req, partner, params, body });
      const res = NextResponse.json({ ok: true, ...out.body }, { status: out.status ?? 200, headers: NO_STORE });
      applyCookie(res, out.cookie);
      return res;
    } catch (err) {
      if (err instanceof RiderError) {
        const res = NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: err.status, headers: NO_STORE });
        if (err.retryAfterSeconds) res.headers.set("Retry-After", String(err.retryAfterSeconds));
        return res;
      }
      // Only the route name and the error type are logged: never the body, the PIN, the code or a Firestore document.
      console.error(`[rider] ${opts.route} failed`, (err as Error | undefined)?.name ?? "error");
      return NextResponse.json({ ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" }, { status: 500, headers: NO_STORE });
    }
  };
}
