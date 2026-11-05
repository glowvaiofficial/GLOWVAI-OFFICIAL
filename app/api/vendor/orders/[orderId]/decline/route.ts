import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { declinedBy, isMine, offerBlock } from "@/lib/vendor/orders";
import { loadVendor, operatorOf } from "@/lib/vendor/store";
import { ORDER_ID_RE, parseDecline } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

// Declines an offer. The order stays offered to the other stores; this store stops seeing it.
export const POST = vendorRoute<{ orderId: string }>({ route: "decline", ip: perMinute(30), user: perMinute(20) }, async ({ req, me, params }) => {
  const orderId = String(params.orderId ?? "");
  if (!ORDER_ID_RE.test(orderId)) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");
  const parsed = parseDecline(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });

  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.canOperate) throw new VendorError("NOT_APPROVED", 403);

  const store = db();
  const ref = store.collection("orders").doc(orderId);
  await store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const order = snap.exists ? (snap.data() as Doc) : null;
    if (!order) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");
    if (declinedBy(order).includes(me.uid)) return; // Already declined: nothing to do.
    if (order.status === "CANCELLED") throw new VendorError("ORDER_CANCELLED", 409);
    if (isMine(order, me.uid)) throw new VendorError("INVALID_STATE", 409, "You already accepted this order.");
    const now = Date.now();
    const block = offerBlock(order, vendor, now, { ignoreFreshness: true });
    if (block === "ASSIGNED") throw new VendorError("ORDER_ALREADY_ASSIGNED", 409);
    // Offline stores may still decline an offer they were shown.
    if (block && block !== "OFFLINE") throw new VendorError("NOT_ELIGIBLE", 403);

    const dispatch = (order.dispatch ?? {}) as Doc;
    const entry: Doc = { vendorUid: me.uid, reason: parsed.value.reason, at: now };
    if (parsed.value.note) entry.note = parsed.value.note;
    tx.update(ref, {
      "dispatch.declinedBy": [...declinedBy(order), me.uid],
      "dispatch.declines": [...(Array.isArray(dispatch.declines) ? dispatch.declines : []), entry],
      updatedAt: now,
      events: [
        ...(Array.isArray(order.events) ? order.events : []),
        { at: now, actor: `Vendor ${vendor.storeName}`, event: `Order declined by the store (${parsed.value.reason})` },
      ],
    });
  });
  return { orderId };
});

export const OPTIONS = preflight;
