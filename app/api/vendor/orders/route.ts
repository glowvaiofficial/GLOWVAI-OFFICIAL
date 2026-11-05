import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { isMine, isOfferFor, toVendorOrder, type VendorOrder } from "@/lib/vendor/orders";
import { loadVendor, operatorOf } from "@/lib/vendor/store";
import { parseSince } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

const MY_ORDERS_LIMIT = 50;
const OFFERS_LIMIT = 30;
const CHANGES_LIMIT = 60;
// On a full load, staff cancellations (admin_orders overlay) are checked for this many of my open orders.
const OVERLAY_CHECK_LIMIT = 10;
const OPEN_STATUSES = new Set(["VENDOR_ACCEPTED", "PACKED"]);

const byNewest = (a: VendorOrder, b: VendorOrder) => b.updatedAt - a.updatedAt;

// The vendor's orders and current offers. since=0 (or absent): full lists, the client replaces its own.
// since>0: only orders changed after `since`; the client merges them and drops the ids in `removed`.
export const GET = vendorRoute({ route: "orders", ip: perMinute(120), user: perMinute(60) }, async ({ req, me }) => {
  const since = parseSince(req.nextUrl.searchParams.get("since"));
  if (!since.ok) throw invalid(since.error, { field: since.field });

  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.canOperate && !vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const store = db();
  const orders = store.collection("orders");
  const serverTime = Date.now();
  const offersOn = vendor.canOperate && vendor.isOnline;

  if (since.value > 0) {
    const snap = await orders.where("updatedAt", ">", since.value).orderBy("updatedAt").limit(CHANGES_LIMIT).get();
    // More changes than one page: fall through to a full load rather than miss any.
    if (snap.size < CHANGES_LIMIT) {
      const result = { serverTime, offers: [] as VendorOrder[], orders: [] as VendorOrder[], removed: [] as string[], full: false };
      for (const d of snap.docs) {
        const o = d.data() as Doc;
        if (isMine(o, me.uid)) result.orders.push(toVendorOrder(o, { uid: me.uid, isOffer: false, orderId: d.id }));
        else if (offersOn && isOfferFor(o, vendor, serverTime)) result.offers.push(toVendorOrder(o, { uid: me.uid, isOffer: true, orderId: d.id }));
        else result.removed.push(d.id);
      }
      result.offers.sort(byNewest);
      result.orders.sort(byNewest);
      return result;
    }
  }

  const [mineSnap, poolSnap] = await Promise.all([
    orders.where("vendorUid", "==", me.uid).limit(MY_ORDERS_LIMIT).get(),
    offersOn ? orders.where("status", "==", "PLACED").where("vendorId", "==", null).limit(OFFERS_LIMIT).get() : Promise.resolve(null),
  ]);

  // Staff cancellations are stored in the admin overlay; check it for my open orders only (a few reads at most).
  const open = mineSnap.docs.filter((d) => OPEN_STATUSES.has(String(d.get("status")))).slice(0, OVERLAY_CHECK_LIMIT);
  const overlays = new Map<string, Doc>();
  if (open.length) {
    const snaps = await store.getAll(...open.map((d) => store.collection("admin_orders").doc(d.id)));
    for (const s of snaps) if (s.exists) overlays.set(s.id, s.data() as Doc);
  }

  const mine = mineSnap.docs.map((d) => toVendorOrder(d.data() as Doc, { uid: me.uid, isOffer: false, overlay: overlays.get(d.id), orderId: d.id }));
  const offers = (poolSnap?.docs ?? [])
    .filter((d) => isOfferFor(d.data() as Doc, vendor, serverTime))
    .map((d) => toVendorOrder(d.data() as Doc, { uid: me.uid, isOffer: true, orderId: d.id }));
  return { serverTime, offers: offers.sort(byNewest), orders: mine.sort(byNewest), removed: [], full: true };
});

export const OPTIONS = preflight;
