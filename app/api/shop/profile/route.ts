import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { customerFrom, db, indianMobile, json, text, tooMany } from "@/lib/shop/server";

export const dynamic = "force-dynamic";

// The customer's own profile, stored in users/{uid} with the field names the GlowVai admin panel reads
// (Customer Management). The phone number is recorded as given; it is not verified until SMS sign-in is connected.
export async function GET(req: NextRequest) {
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const snap = await db().collection("users").doc(customer.uid).get();
  const d = snap.data() ?? {};
  return json({
    ok: true,
    profile: snap.exists
      ? {
          name: d.name ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          address: d.address ?? null,
          marketingOptIn: d.consents?.marketing === true,
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  if (tooMany(`profile:${customer.uid}`, 20, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const name = text(body.name, 80);
  const phone = indianMobile(body.phone);
  const email = text(body.email, 120).toLowerCase();
  if (name.length < 2) return json({ ok: false, error: "Enter your name." }, 400);
  if (!phone) return json({ ok: false, error: "Enter a 10-digit Indian mobile number." }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Enter a valid email, or leave it empty." }, 400);

  const raw = (body.address ?? {}) as Record<string, unknown>;
  const pincode = text(raw.pincode, 6);
  if (pincode && !/^\d{6}$/.test(pincode)) return json({ ok: false, error: "Enter a 6-digit pincode." }, 400);
  const address = {
    fullAddress: text(raw.fullAddress, 300),
    city: text(raw.city, 60),
    pincode,
    landmark: text(raw.landmark, 120),
  };

  const ref = db().collection("users").doc(customer.uid);
  const now = Date.now();
  const existing = await ref.get();
  await ref.set(
    {
      uid: customer.uid,
      name,
      phone,
      email: email || FieldValue.delete(),
      address,
      phoneVerified: false,
      consents: { marketing: body.marketingOptIn === true, analytics: body.analyticsOptIn === true },
      consentTimestamp: now,
      onboardingCompleted: true,
      source: "web_shop",
      role: "customer",
      lastActiveAt: now,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );
  return json({ ok: true });
}
