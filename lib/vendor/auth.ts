// Who is calling the vendor API: a Firebase Auth email + password account, from the ID token in the Authorization
// header. Revoked tokens are refused. Anonymous shop customers and phone/Google accounts are not vendor accounts.
import "server-only";
import { adminAuth } from "@/lib/shop/server";
import { VendorError } from "./errors";
import { applicationIdFor } from "./state";

export interface VendorIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  applicationId: string;
}

export async function vendorIdentity(authorization: string | null, opts: { allowUnverified?: boolean } = {}): Promise<VendorIdentity> {
  const header = authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Firebase ID tokens are ~1 KB; refuse anything absurd before verifying.
  if (!token || token.length > 4096) throw new VendorError("UNAUTHENTICATED", 401);
  // Outside the try: a server misconfiguration (no service account) is a 500, not "sign in again".
  const auth = adminAuth();
  let decoded: Awaited<ReturnType<typeof auth.verifyIdToken>>;
  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    // Expired, revoked, malformed or disabled: all mean "sign in again". Anything else is our problem; log it.
    if (!code.startsWith("auth/")) console.error("[vendor-api] token check failed", err);
    throw new VendorError("UNAUTHENTICATED", 401);
  }
  if (decoded.firebase?.sign_in_provider !== "password" || !decoded.email) throw new VendorError("NOT_A_VENDOR_ACCOUNT", 403);
  const emailVerified = decoded.email_verified === true;
  if (!emailVerified && !opts.allowUnverified) throw new VendorError("EMAIL_NOT_VERIFIED", 403);
  return { uid: decoded.uid, email: decoded.email.toLowerCase(), emailVerified, applicationId: applicationIdFor(decoded.uid) };
}
