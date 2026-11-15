import { db } from "@/lib/shop/server";
import { VendorError } from "@/lib/vendor/errors";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { chunkIds, vendorReturnView, type VendorReturnView } from "@/lib/vendor/returns";
import { loadVendor, operatorOf } from "@/lib/vendor/store";
import { RETURN_COLLECTION } from "@/lib/shop/returns";

export const dynamic = "force-dynamic";

const MY_ORDERS_LIMIT = 50;
const RETURNS_LIMIT = 50;

// Return requests on this store's orders. Read only: staff decide returns, and no refund is handled here.
export const GET = vendorRoute({ route: "returns", ip: perMinute(60), user: perMinute(30) }, async ({ me }) => {
  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const store = db();
  // Scope: only orders whose vendorUid is this vendor. Returns are then matched by order id.
  const mine = await store.collection("orders").where("vendorUid", "==", me.uid).limit(MY_ORDERS_LIMIT).get();
  const orderIds = mine.docs.map((d) => d.id);
  const returns: VendorReturnView[] = [];
  for (const ids of chunkIds(orderIds)) {
    const snap = await store.collection(RETURN_COLLECTION).where("orderId", "in", ids).limit(RETURNS_LIMIT).get();
    for (const d of snap.docs) returns.push(vendorReturnView(d.data() as Record<string, unknown>, d.id));
  }
  returns.sort((a, b) => b.createdAt - a.createdAt);
  return { returns: returns.slice(0, RETURNS_LIMIT) };
});

export const OPTIONS = preflight;
