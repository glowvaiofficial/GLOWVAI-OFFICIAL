import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { applicationRef, loadVendor, operatorOf, patchCachedApplication } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

// A heartbeat younger than this with the same online flag is not written again (saves Firestore writes).
const HEARTBEAT_SKIP_MS = 45_000;

// Goes online or offline. Also the heartbeat: the app sends { isOnline: true } every 60 s while open and online.
export const POST = vendorRoute({ route: "status", ip: perMinute(30), user: perMinute(20) }, async ({ req, me }) => {
  const body = (await readJson(req)) as Record<string, unknown> | null;
  if (!body || typeof body.isOnline !== "boolean") throw invalid("Send isOnline as true or false.", { field: "isOnline" });
  const isOnline = body.isOnline;

  const record = await loadVendor(me.uid);
  const vendor = operatorOf(record);
  if (!record.app) throw new VendorError("NOT_APPROVED", 403);
  // Going offline is always allowed (a paused store should not stay shown as online); going online needs approval.
  if (isOnline && !vendor.canOperate) throw new VendorError("NOT_APPROVED", 403);

  const now = Date.now();
  if (vendor.isOnline === isOnline && vendor.lastSeenAt !== null && now - vendor.lastSeenAt < HEARTBEAT_SKIP_MS) {
    return { isOnline, lastSeenAt: vendor.lastSeenAt };
  }
  const patch = { isOnline, lastSeenAt: now, updatedAt: now };
  await applicationRef(me.uid).update(patch);
  patchCachedApplication(me.uid, patch);
  return { isOnline, lastSeenAt: now };
});

export const OPTIONS = preflight;
