import { NextRequest } from "next/server";
import { json, limitByIp } from "@/lib/shop/server";
import { internalSecret, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInternalRequest } from "@/lib/shop/refunds";
import { recheckHeldTopupLive } from "@/lib/shop/wallet/live";
import { parseRecheckBody, RECHECK_MAX_BODY, statusFor, topupsEnabled } from "@/lib/shop/wallet/recheck";

export const dynamic = "force-dynamic";

// Server-to-server only. Re-checks a held top-up capture: Razorpay is asked again, and coins are credited once if the
// payment now matches. Body: { captureId } (a pay_... id) or { topupId }. Refused unless WALLET_TOPUP_ENABLED is "true".
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-wallet-recheck", 30);
  if (ipLimited) return ipLimited;
  const secret = internalSecret();
  if (!secret) return json({ ok: false, code: "NOT_CONFIGURED", error: "INTERNAL_API_SECRET is not set on the shop server." }, 503);
  const raw = await req.text();
  if (raw.length > RECHECK_MAX_BODY) return json({ ok: false, code: "TOO_LARGE", error: "Request body is too large." }, 413);
  const verified = verifyInternalRequest({
    secret,
    timestamp: req.headers.get(TIMESTAMP_HEADER),
    signature: req.headers.get(SIGNATURE_HEADER),
    rawBody: raw,
    now: Date.now(),
  });
  if (!verified.ok) {
    const error = verified.reason === "STALE" ? "Request timestamp is missing or more than 5 minutes off." : "Request signature is not valid.";
    return json({ ok: false, code: "UNAUTHORISED", error }, 401);
  }
  if (!topupsEnabled()) {
    return json({ ok: false, code: "WALLET_TOPUP_DISABLED", error: "Wallet top-ups are off on the shop server (WALLET_TOPUP_ENABLED is not true)." }, 503);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "BAD_REQUEST", error: "Body must be JSON." }, 400);
  }
  const parsed = parseRecheckBody(body);
  if (!parsed.ok) return json({ ok: false, code: "BAD_REQUEST", error: parsed.error }, 400);

  try {
    const result = await recheckHeldTopupLive(parsed.value);
    return json({ ok: result.outcome !== "REFUSED", ...result }, statusFor(result));
  } catch {
    return json({ ok: false, code: "INTERNAL_ERROR", error: "The top-up could not be re-checked. Retry the same request." }, 500);
  }
}
