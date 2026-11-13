import { randomBytes } from "node:crypto";
import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import {
  byNewestRequest,
  dailyRequestAllowed,
  istDayKey,
  parseProductRequest,
  toRequestView,
  type ProductRequestView,
} from "@/lib/vendor/productRequests";
import { loadVendor, operatorOf } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

const LIST_LIMIT = 50;

// My product requests, newest first, with the status the GlowVai team has set.
export const GET = vendorRoute({ route: "product-requests-get", ip: perMinute(60), user: perMinute(30) }, async ({ me }) => {
  const snap = await db().collection("productRequests").where("vendorUid", "==", me.uid).limit(LIST_LIMIT).get();
  const requests: ProductRequestView[] = snap.docs.map((d) => toRequestView(d.id, d.data() as Doc)).sort(byNewestRequest);
  return { requests };
});

// Sends a request for a product that is not in the catalogue. At most DAILY_REQUEST_CAP per vendor per IST day; the cap
// is counted in a per-day document inside the same transaction as the write, so two quick taps cannot both pass.
export const POST = vendorRoute({ route: "product-requests-post", ip: perMinute(10), user: perMinute(10), shared: true }, async ({ req, me }) => {
  const parsed = parseProductRequest(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  const input = parsed.value;

  const store = db();
  const now = Date.now();
  const dayKey = istDayKey(now);
  const dayRef = store.collection("vendors").doc(me.uid).collection("productRequestDays").doc(dayKey);
  const id = `PR-${now.toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
  const ref = store.collection("productRequests").doc(id);

  // Only an approved store may ask for products (the same rule as stock).
  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const doc: Doc = {
    id,
    vendorUid: me.uid,
    vendorApplicationId: me.applicationId,
    name: input.name,
    brand: input.brand,
    category: input.category,
    mrp: input.mrp,
    barcode: input.barcode,
    pictureUrls: input.pictureUrls,
    reason: input.reason,
    status: "PENDING",
    staffNote: null,
    dayKey,
    createdAt: now,
    updatedAt: now,
  };

  await store.runTransaction(async (tx) => {
    const day = await tx.get(dayRef);
    const sent = Number(day.get("count")) || 0;
    if (!dailyRequestAllowed(sent)) throw new VendorError("DAILY_LIMIT", 429);
    tx.create(ref, doc);
    tx.set(dayRef, { count: sent + 1, updatedAt: now }, { merge: true });
  });

  return { request: toRequestView(id, doc) };
});

export const OPTIONS = preflight;
