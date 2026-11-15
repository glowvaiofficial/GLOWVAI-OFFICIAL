// One check for every route that writes customer data or money: the caller must hold a REAL phone-verified account.
// Anonymous Firebase sessions may browse and call public routes, but they are refused here with
//   401 { ok: false, code: "PHONE_REQUIRED", error: "..." }
// which the web client and the native app turn into the phone sign-in screen (not an error toast).
//
// Accepted: a Firebase ID token whose sign_in_provider is "phone" (the phone comes from the token's phone_number claim),
// or a non-anonymous token (for example a custom token from an SMS provider) whose server record users/{uid} says
// phoneVerified === true. Nothing here logs the token or the phone number.
//
// No "server-only" and no static firebase import: the verifier and the record lookup are injected, so the decision is
// tested without network (__tests__/web-auth). The default dependencies load lib/shop/server on first use.
import { NextResponse, type NextRequest } from "next/server";
import { indianE164 } from "../shop/account/rules";

export const PHONE_REQUIRED_CODE = "PHONE_REQUIRED";
export const PHONE_REQUIRED_MESSAGE = "Sign in with your mobile number to continue.";

export interface VerifiedToken {
  uid: string;
  phone_number?: string;
  firebase?: { sign_in_provider?: string };
}

export interface PhoneUserDeps {
  verifyIdToken: (token: string) => Promise<VerifiedToken>;
  // The stored phone for a uid when the server record marks it verified, else null.
  verifiedPhoneOf: (uid: string) => Promise<string | null>;
}

export interface PhoneUser {
  uid: string;
  phone: string;
  // Always false: kept so existing code that reads customer.anonymous keeps compiling.
  anonymous: false;
}

export type PhoneUserResult = { ok: true; user: PhoneUser } | { ok: false; response: NextResponse };

const noStore = { "Cache-Control": "no-store" };

function refuse(status: number, code: string, error: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ ok: false, code, error }, { status, headers: noStore }) };
}

async function defaultDeps(): Promise<PhoneUserDeps> {
  const { adminAuth, db } = await import("../shop/server");
  return {
    verifyIdToken: (token) => adminAuth().verifyIdToken(token) as Promise<VerifiedToken>,
    verifiedPhoneOf: async (uid) => {
      const snap = await db().collection("users").doc(uid).get();
      const d = snap.data() as { phone?: unknown; phoneVerified?: unknown } | undefined;
      return d && d.phoneVerified === true && typeof d.phone === "string" ? d.phone : null;
    },
  };
}

export async function requirePhoneUser(req: NextRequest, deps?: PhoneUserDeps): Promise<PhoneUserResult> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return refuse(401, "SIGN_IN_REQUIRED", "Sign in again to continue.");

  let claims: VerifiedToken;
  let d: PhoneUserDeps;
  try {
    d = deps ?? (await defaultDeps());
    claims = await d.verifyIdToken(token);
  } catch {
    return refuse(401, "SIGN_IN_REQUIRED", "Sign in again to continue.");
  }
  const uid = typeof claims.uid === "string" ? claims.uid : "";
  if (!uid || uid.length > 128) return refuse(401, "SIGN_IN_REQUIRED", "Sign in again to continue.");

  const provider = claims.firebase?.sign_in_provider;
  if (provider === "anonymous") return refuse(401, PHONE_REQUIRED_CODE, PHONE_REQUIRED_MESSAGE);

  if (provider === "phone") {
    const phone = indianE164(claims.phone_number);
    if (phone && phone === claims.phone_number) return { ok: true, user: { uid, phone, anonymous: false } };
    return refuse(401, PHONE_REQUIRED_CODE, PHONE_REQUIRED_MESSAGE);
  }

  // Another provider (custom token, email): only an existing server record with a verified phone counts.
  try {
    const stored = await d.verifiedPhoneOf(uid);
    const phone = indianE164(stored);
    if (phone) return { ok: true, user: { uid, phone, anonymous: false } };
  } catch {
    // Fall through to the refusal: an unreadable record never grants access.
  }
  return refuse(401, PHONE_REQUIRED_CODE, PHONE_REQUIRED_MESSAGE);
}
