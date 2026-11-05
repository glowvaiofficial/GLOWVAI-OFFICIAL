// The one wrapper every /api/vendor route uses, so each route runs the same checks in the same order:
// origin (CORS) -> IP rate limit -> Firebase token -> per-user rate limit -> the route's own validation and work.
// Responses are JSON with Cache-Control: no-store. Unexpected errors are logged and answered with a friendly message.
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, tooMany } from "@/lib/shop/server";
import { vendorIdentity, type VendorIdentity } from "./auth";
import { allowedOrigins, checkOrigin, corsHeaders, type OriginCheck } from "./cors";
import { VendorError, errorBody, invalid } from "./errors";

export interface Limit {
  max: number;
  windowMs: number;
}
export const perMinute = (max: number): Limit => ({ max, windowMs: 60_000 });
export const perHour = (max: number): Limit => ({ max, windowMs: 3_600_000 });

const MAX_BODY_BYTES = 32 * 1024;

function originOf(req: NextRequest): OriginCheck {
  return checkOrigin(req.headers.get("origin"), allowedOrigins(process.env));
}

function respond(body: Record<string, unknown>, status: number, origin: OriginCheck): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...corsHeaders(origin) } });
}

/** CORS preflight. Allowed origins get the CORS headers; others get 403 without them, so the browser blocks the call. */
export function preflight(req: NextRequest): NextResponse {
  const origin = originOf(req);
  const status = origin.kind === "denied" ? 403 : 204;
  return new NextResponse(null, { status, headers: { "Cache-Control": "no-store", ...corsHeaders(origin) } });
}

/** Reads a small JSON body. Missing or broken JSON is an INVALID_INPUT refusal. */
export async function readJson(req: NextRequest): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new VendorError("PAYLOAD_TOO_LARGE", 413);
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) throw new VendorError("PAYLOAD_TOO_LARGE", 413);
  if (!raw) throw invalid("Send the request details as JSON.");
  try {
    return JSON.parse(raw);
  } catch {
    throw invalid("Send the request details as JSON.");
  }
}

export interface VendorContext<P> {
  req: NextRequest;
  me: VendorIdentity;
  params: P;
}

interface RouteOptions {
  /** Rate-limit key for this route and method. */
  route: string;
  ip: Limit;
  user: Limit;
  /** Only GET /me answers accounts whose email is not verified yet. */
  allowUnverified?: boolean;
}

export function vendorRoute<P extends Record<string, string> = Record<string, never>>(
  opts: RouteOptions,
  work: (ctx: VendorContext<P>) => Promise<Record<string, unknown>>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    const origin = originOf(req);
    try {
      if (origin.kind === "denied") throw new VendorError("ORIGIN_NOT_ALLOWED", 403);
      if (tooMany(`ip:vendor-${opts.route}:${clientIp(req)}`, opts.ip.max, opts.ip.windowMs)) throw new VendorError("RATE_LIMITED", 429);
      const me = await vendorIdentity(req.headers.get("authorization"), { allowUnverified: opts.allowUnverified });
      if (tooMany(`user:vendor-${opts.route}:${me.uid}`, opts.user.max, opts.user.windowMs)) throw new VendorError("RATE_LIMITED", 429);
      const params = ((await context?.params) ?? {}) as P;
      const body = await work({ req, me, params });
      return respond({ ...body, ok: true }, 200, origin);
    } catch (err) {
      if (err instanceof VendorError) return respond(errorBody(err), err.status, origin);
      console.error(`[vendor-api] ${opts.route} failed`, err);
      return respond(errorBody(new VendorError("INTERNAL", 500)), 500, origin);
    }
  };
}
