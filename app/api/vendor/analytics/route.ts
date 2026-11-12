import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { ANALYTICS_QUERY_LIMIT, cachedAnalytics, computeAnalytics, parseDays, rememberAnalytics } from "@/lib/vendor/analytics";
import { loadVendor, operatorOf } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

// Store activity for the last 7 or 30 days, from this store's own orders only. Two bounded reads (500 orders each): the
// orders it accepted, and the orders it declined. Cached per instance for 5 minutes.
export const GET = vendorRoute({ route: "analytics", ip: perMinute(30), user: perMinute(20) }, async ({ req, me }) => {
  const days = parseDays(req.nextUrl.searchParams.get("days"));
  if (!days) throw invalid("Choose 7 or 30 days.", { field: "days" });

  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const now = Date.now();
  const key = `${me.uid}:${days}`;
  const hit = cachedAnalytics(key, now);
  if (hit) return { ...hit };

  const store = db();
  const orders = store.collection("orders");
  const [mineSnap, declinedSnap] = await Promise.all([
    orders.where("vendorUid", "==", me.uid).limit(ANALYTICS_QUERY_LIMIT).get(),
    orders.where("dispatch.declinedBy", "array-contains", me.uid).limit(ANALYTICS_QUERY_LIMIT).get(),
  ]);
  const result = computeAnalytics(
    {
      mine: mineSnap.docs.map((d) => ({ ...d.data(), orderId: d.id })),
      declined: declinedSnap.docs.map((d) => ({ ...d.data(), orderId: d.id })),
    },
    { now, days },
  );
  rememberAnalytics(key, result, now);
  return { ...result };
});

export const OPTIONS = preflight;
