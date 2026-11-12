import { NextRequest } from "next/server";
import { db, json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { applyConsentChanges, consentFrom, parseConsentBody } from "@/lib/shop/privacy/rules";
import { logActivity } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// Marketing and analytics choices, with the date each was last changed. Turning marketing off also turns off the
// offers notifications, and offers pushes already need marketing consent to send, so nothing marketing goes out after it.
export async function GET(req: NextRequest) {
  const g = await gate(req, "privacy-consent-get", 60);
  if (g.response) return g.response;
  const snap = await db().collection("users").doc(g.uid as string).get();
  const c = consentFrom((snap.data() ?? {}).consents);
  return json({ ok: true, consents: c });
}

export async function POST(req: NextRequest) {
  const g = await gate(req, "privacy-consent-post", 20);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = await req.json().catch(() => null);
  const parsed = parseConsentBody(body);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

  const store = db();
  const ref = store.collection("users").doc(uid);
  const now = Date.now();
  const outcome = await store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = consentFrom((snap.data() ?? {}).consents);
    const { next, changed } = applyConsentChanges(current, parsed.changes, now);
    if (changed.length === 0) return { next, changed };
    const consents = {
      marketing: next.marketing,
      analytics: next.analytics,
      marketingUpdatedAt: next.marketingUpdatedAt,
      analyticsUpdatedAt: next.analyticsUpdatedAt,
    };
    const patch: Record<string, unknown> = { consents, updatedAt: now };
    if (changed.includes("marketing") && !next.marketing) patch.notificationPrefs = { offers: false };
    tx.set(ref, patch, { merge: true });
    return { next, changed };
  });
  if (outcome.changed.length > 0) {
    await logActivity(uid, "CONSENT_CHANGED", outcome.changed.map((k) => `${k} ${outcome.next[k] ? "on" : "off"}`).join(", "), now);
  }
  return json({ ok: true, consents: outcome.next, changed: outcome.changed });
}
