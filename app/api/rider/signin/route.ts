import { clientIp } from "@/lib/shop/server";
import { firstNameOf, signInWithPin } from "@/lib/rider/auth";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// Phone plus 6-digit PIN. The attempt limits (5 per 15 minutes per phone and per IP, then a 15-minute lock) are counted
// in Firestore inside signInWithPin, so they hold across instances.
export const POST = riderRoute({ route: "signin", write: true, auth: false }, async ({ req, body }) => {
  const { partner, token } = await signInWithPin({ phone: body.phone, pin: body.pin, ip: clientIp(req), now: Date.now() });
  return { body: { partner: { firstName: firstNameOf(partner.name) } }, cookie: { value: token } };
});
