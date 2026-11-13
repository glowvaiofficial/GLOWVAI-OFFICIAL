import { NextRequest } from "next/server";
import { adminAuth, db, json, limitByIpShared, limitByUserShared } from "@/lib/shop/server";
import { bodyPhoneMatches, phoneAccountClaims, planAccountWrite } from "@/lib/shop/account/rules";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

// Creates the customer's account record (users/{uid}) after a phone sign-in. The uid and the phone number come only
// from the verified ID token, which must be a phone-provider token. Calling it again returns the existing account and
// never overwrites it. Nothing here logs the phone number or the token.
export async function POST(req: NextRequest) {
  // Checked before the token, so a flood of bad requests costs nothing.
  const ipLimited = await limitByIpShared(req, "account-create", 10, HOUR, "Too many attempts. Try again later.");
  if (ipLimited) return ipLimited;

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return json({ ok: false, error: "Sign in again to continue." }, 401);

  let claims;
  try {
    claims = await adminAuth().verifyIdToken(token);
  } catch {
    return json({ ok: false, error: "Sign in again to continue." }, 401);
  }

  const checked = phoneAccountClaims(claims);
  if (!checked.ok) return json({ ok: false, error: checked.error }, checked.status);

  // The phone comes from the token. A body phone is optional, and must match the token when it is sent.
  const body: unknown = await req.json().catch(() => null);
  if (!bodyPhoneMatches(body, checked.phone)) {
    return json({ ok: false, error: "The phone number does not match your sign-in." }, 400);
  }

  const uidLimited = await limitByUserShared(checked.uid, "account-create", 5, HOUR, "Too many attempts. Try again later.");
  if (uidLimited) return uidLimited;

  const ref = db().collection("users").doc(checked.uid);
  const now = Date.now();
  await db().runTransaction(async (tx) => {
    // Reset on every attempt: Firestore may run this callback again after a conflict.
    const snap = await tx.get(ref);
    const plan = planAccountWrite(snap.exists ? (snap.data() as Record<string, unknown>) : undefined, checked.uid, checked.phone, now);
    if (plan.kind === "create") tx.set(ref, plan.record);
    else tx.update(ref, plan.update);
  });

  return json({ ok: true, account: { uid: checked.uid, phoneVerified: true } });
}
