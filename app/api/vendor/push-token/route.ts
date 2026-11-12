import { invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { parseVendorPushToken } from "@/lib/vendor/pushToken";
import { saveVendorPushToken } from "@/lib/vendor/pushTokens";

export const dynamic = "force-dynamic";

// Registers this vendor device for order alerts. Body: { token, platform: ios|android|web, tokenType: EXPO|FCM }.
// A vendor keeps at most 3 devices; the least recently refreshed one is dropped when a fourth registers.
// Returns { registered, devices }. The token is never sent back.
export const POST = vendorRoute({ route: "push-token", ip: perMinute(20), user: perMinute(10) }, async ({ req, me }) => {
  const parsed = parseVendorPushToken(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  const { devices } = await saveVendorPushToken(me.uid, parsed.value, Date.now());
  return { registered: true, devices };
});

export const OPTIONS = preflight;
