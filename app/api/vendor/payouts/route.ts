import { db } from "@/lib/shop/server";
import { VendorError } from "@/lib/vendor/errors";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { LEDGER_ORDER_LIMIT, LEDGER_SETTLEMENT_LIMIT, cachedLedger, computeLedger, rememberLedger } from "@/lib/vendor/ledger";
import { applicationIdFor } from "@/lib/vendor/state";
import { loadVendor, operatorOf } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

// Read-only payout ledger for this store: delivered-order earnings, commission at the admin's saved rate, settlements the
// admin has released, and the balance due. Three bounded reads (500 orders, 100 settlements, 1 config document), cached
// per instance for 2 minutes so polling does not spend the shared Firestore quota. Writes nothing.
export const GET = vendorRoute({ route: "payouts", ip: perMinute(30), user: perMinute(15) }, async ({ me }) => {
  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const now = Date.now();
  const hit = cachedLedger(me.uid, now);
  if (hit) return { ...hit };

  const store = db();
  const [ordersSnap, settlementsSnap, configSnap] = await Promise.all([
    store.collection("orders").where("vendorUid", "==", me.uid).where("status", "==", "DELIVERED").limit(LEDGER_ORDER_LIMIT).get(),
    store.collection("admin_settlements").where("vendorId", "==", applicationIdFor(me.uid)).limit(LEDGER_SETTLEMENT_LIMIT).get(),
    store.collection("admin_config").doc("financeSettings").get(),
  ]);
  const result = computeLedger(
    {
      orders: ordersSnap.docs.map((d) => ({ ...d.data(), orderId: d.id })),
      settlements: settlementsSnap.docs.map((d) => ({ ...d.data(), id: d.data().id ?? d.id })),
      config: configSnap.exists ? (configSnap.data() as Record<string, unknown>) : null,
    },
    now,
  );
  rememberLedger(me.uid, result, now);
  return { ...result };
});

export const OPTIONS = preflight;
