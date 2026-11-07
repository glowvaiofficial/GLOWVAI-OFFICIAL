import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { customerFrom, db, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { recordActivity } from "@/lib/shop/activity";
import { DEFAULT_LANGUAGE, nextConsents, validateProfileInput, type ActivityType } from "@/lib/shop/settings/rules";

export const dynamic = "force-dynamic";

// The customer's own profile, stored in users/{uid} with the field names the GlowVai admin panel reads
// (Customer Management). The phone number is recorded as given; it is not verified until SMS sign-in is connected.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "profile-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "profile-get", 60);
  if (userLimited) return userLimited;
  const snap = await db().collection("users").doc(customer.uid).get();
  const d = snap.data() ?? {};
  const consents = (d.consents ?? {}) as Record<string, unknown>;
  return json({
    ok: true,
    profile: snap.exists
      ? {
          name: d.name ?? "",
          phone: d.phone ?? "",
          phoneVerified: false,
          email: d.email ?? "",
          address: d.address ?? null,
          marketingOptIn: consents.marketing === true,
          analyticsOptIn: consents.analytics === true,
          marketingAt: typeof consents.marketingAt === "number" ? consents.marketingAt : null,
          analyticsAt: typeof consents.analyticsAt === "number" ? consents.analyticsAt : null,
          language: typeof d.language === "string" ? d.language : DEFAULT_LANGUAGE,
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "profile-post", 20);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  if (tooMany(`profile:${customer.uid}`, 20, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Invalid request." }, 400);
  const checked = validateProfileInput(body);
  if (!checked.ok) return json({ ok: false, error: checked.error, field: checked.field }, 400);
  const input = checked.value;

  const ref = db().collection("users").doc(customer.uid);
  const now = Date.now();
  let changed: ActivityType[] = [];
  await db().runTransaction(async (tx) => {
    // Reset on every attempt: Firestore may run this callback again after a conflict.
    changed = [];
    const existing = await tx.get(ref);
    const before = (existing.data() ?? {}) as Record<string, unknown>;
    const prevConsents = (before.consents ?? {}) as Record<string, unknown>;
    const consents = nextConsents(
      {
        marketing: prevConsents.marketing === true,
        analytics: prevConsents.analytics === true,
        marketingAt: typeof prevConsents.marketingAt === "number" ? prevConsents.marketingAt : null,
        analyticsAt: typeof prevConsents.analyticsAt === "number" ? prevConsents.analyticsAt : null,
      },
      { marketing: input.marketing, analytics: input.analytics },
      now,
    );
    const prevEmail = typeof before.email === "string" ? before.email : "";
    if (before.phone !== input.phone && existing.exists) changed.push("phone_updated");
    if (prevEmail !== input.email && existing.exists) changed.push("email_updated");
    if (
      prevConsents.marketing !== consents.marketing ||
      prevConsents.analytics !== consents.analytics
    ) {
      changed.push("consent_updated");
    }
    if (changed.length === 0) changed.push("profile_updated");

    tx.set(
      ref,
      {
        uid: customer.uid,
        name: input.name,
        phone: input.phone,
        email: input.email || FieldValue.delete(),
        // The address is only written when the request carries one. A save without it keeps the stored address.
        ...(input.address ? { address: input.address } : {}),
        phoneVerified: false,
        consents: { marketing: consents.marketing, analytics: consents.analytics, marketingAt: consents.marketingAt, analyticsAt: consents.analyticsAt },
        consentTimestamp: now,
        onboardingCompleted: true,
        source: "web_shop",
        role: "customer",
        lastActiveAt: now,
        updatedAt: now,
        ...(existing.exists ? {} : { createdAt: now, language: DEFAULT_LANGUAGE }),
      },
      { merge: true },
    );
  });
  for (const type of [...new Set(changed)]) await recordActivity(customer.uid, type, now);
  return json({ ok: true });
}
