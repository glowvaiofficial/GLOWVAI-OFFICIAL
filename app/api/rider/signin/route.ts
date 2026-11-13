import { clientIp } from "@/lib/shop/server";
import { checkRateLimit } from "@/lib/shop/rateLimit";
import { indianMobile } from "@/lib/shop/text";
import { firstNameOf, signInWithPin } from "@/lib/rider/auth";
import { RiderError } from "@/lib/rider/errors";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Phone plus 6-digit PIN. The attempt limits (5 per 15 minutes per phone and per IP, then a 15-minute lock) are counted
// in Firestore inside signInWithPin, so they hold across instances. The per-IP and per-phone limits below also use the
// shared limiter (Upstash when configured); the phone is only ever hashed inside the limiter.
export const POST = riderRoute({ route: "signin", write: true, auth: false, shared: true, ip: { max: 5, windowMs: FIFTEEN_MINUTES } }, async ({ req, body }) => {
  const digits = indianMobile(body.phone);
  if (digits) {
    const phone = await checkRateLimit({ key: `rider-signin:phone:${digits}`, max: 5, windowMs: FIFTEEN_MINUTES });
    if (!phone.allowed) throw new RiderError("RATE_LIMITED", 429, "Too many sign-in attempts. Please wait 15 minutes and try again.", phone.retryAfterSeconds);
  }
  const { partner, token } = await signInWithPin({ phone: body.phone, pin: body.pin, ip: clientIp(req), now: Date.now() });
  return { body: { partner: { firstName: firstNameOf(partner.name) } }, cookie: { value: token } };
});
