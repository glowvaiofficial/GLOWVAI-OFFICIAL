import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perHour, perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { EDITABLE_STATES, applicationIdFor, toVendorMe, vendorStateOf } from "@/lib/vendor/state";
import { applicationRef, overlayRef, remember } from "@/lib/vendor/store";
import { parseApplication } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

// Creates or resubmits the store application. Allowed with no application yet, or while it is SUBMITTED,
// DOCUMENTS_REQUESTED or REJECTED. Locked while the team reviews it and once it is approved.
export const POST = vendorRoute({ route: "application", ip: perMinute(10), user: perHour(10) }, async ({ req, me }) => {
  const parsed = parseApplication(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  const fields = parsed.value;

  const store = db();
  const appRef = applicationRef(me.uid);
  const ovRef = overlayRef(me.uid);
  const { doc, overlay } = await store.runTransaction(async (tx) => {
    const [appSnap, ovSnap] = await tx.getAll(appRef, ovRef);
    const existing = appSnap.exists ? (appSnap.data() as Doc) : null;
    const overlay = ovSnap.exists ? (ovSnap.data() as Doc) : null;
    if (!EDITABLE_STATES.includes(vendorStateOf(existing, overlay).state)) throw new VendorError("APPLICATION_LOCKED", 409);
    const now = Date.now();
    const doc: Doc = {
      ...fields,
      applicationId: applicationIdFor(me.uid),
      applicantUid: me.uid,
      email: me.email,
      status: "PENDING_APPROVAL",
      submittedAt: typeof existing?.submittedAt === "number" ? existing.submittedAt : now,
      updatedAt: now,
      isOnline: existing?.isOnline === true,
      lastSeenAt: typeof existing?.lastSeenAt === "number" ? existing.lastSeenAt : null,
    };
    if (existing) doc.resubmittedAt = now;
    // A full set (not merge): optional fields the vendor removed are removed from the record too.
    tx.set(appRef, doc);
    return { doc, overlay };
  });

  remember(me.uid, doc, overlay);
  return { vendor: toVendorMe(me.uid, doc, overlay) };
});

export const OPTIONS = preflight;
