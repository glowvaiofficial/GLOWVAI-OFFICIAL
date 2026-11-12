import { NextRequest } from "next/server";
import { json, limitByIp } from "@/lib/shop/server";
import { internalSecret, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInternalRequest } from "@/lib/shop/refunds";
import { INTERNAL_NOTIFY_MAX_BODY, notifyOnce, parseInternalNotify } from "@/lib/shop/internalNotify";
import { notifyCustomer } from "@/lib/shop/notify";
import { claimNotification, releaseNotificationClaim } from "@/lib/shop/notifyStore";

export const dynamic = "force-dynamic";

// Server-to-server only: another GlowVai service asks the shop to tell a customer about an event. The request is signed
// with INTERNAL_API_SECRET (lib/shop/refunds.ts). The copy comes from lib/shop/notifications/templates.ts; the caller
// sends only the type and a related id. Each (uid, type, relatedId) is sent once: a repeat returns duplicate: true.
// Body: { uid, type, relatedId? }.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-notify", 60);
  if (ipLimited) return ipLimited;
  const secret = internalSecret();
  if (!secret) return json({ ok: false, code: "NOT_CONFIGURED", error: "INTERNAL_API_SECRET is not set on the shop server." }, 503);
  const raw = await req.text();
  if (raw.length > INTERNAL_NOTIFY_MAX_BODY) return json({ ok: false, code: "TOO_LARGE", error: "Request body is too large." }, 413);
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
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "BAD_REQUEST", error: "Body must be JSON." }, 400);
  }
  const parsed = parseInternalNotify(body);
  if (!parsed.ok) return json({ ok: false, code: "BAD_REQUEST", error: parsed.error }, 400);

  try {
    const outcome = await notifyOnce(
      {
        claim: (uid, claimId) => claimNotification(uid, claimId, Date.now()),
        release: releaseNotificationClaim,
      },
      notifyCustomer,
      parsed.value,
    );
    if (outcome.duplicate) return json({ ok: true, duplicate: true });
    return json({ ok: true, duplicate: false, inApp: outcome.result.inApp, push: outcome.result.push });
  } catch {
    return json({ ok: false, code: "INTERNAL_ERROR", error: "The notification could not be recorded. Retry the same request." }, 500);
  }
}
