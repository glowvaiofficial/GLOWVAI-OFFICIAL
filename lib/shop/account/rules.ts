// Pure rules for the phone account: Indian mobile numbers in E.164, the 6-digit code, the account record the GlowVai
// admin panel reads (users/{uid}), the create-or-keep decision, and the checks on the ID token. No server imports, so
// the browser sign-in screens and the node tests use the same rules as the route.

// ---- Phone and code -----------------------------------------------------------------------------------------------

export const INDIA_DIAL_CODE = "+91";
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

// The 10-digit national number from what a person typed, or null. Accepts "98765 43210", "+91 98765 43210",
// "0 98765 43210" and "919876543210". Anything else (other countries, 9 or 11 digits, numbers starting 0-5) is refused.
export function indianNationalNumber(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  let digits: string;
  if (trimmed.startsWith("+")) {
    digits = trimmed.slice(1).replace(/\D/g, "");
    if (!digits.startsWith("91")) return null;
    digits = digits.slice(2);
  } else {
    digits = trimmed.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  }
  return MOBILE_PATTERN.test(digits) ? digits : null;
}

// The E.164 form (+91XXXXXXXXXX) of an Indian mobile number as typed, or null.
export function indianE164(input: unknown): string | null {
  const national = indianNationalNumber(input);
  return national ? `${INDIA_DIAL_CODE}${national}` : null;
}

export const OTP_LENGTH = 6;

// The 6-digit SMS code, spaces allowed, or null.
export function otpCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\s/g, "");
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(digits) ? digits : null;
}

// ---- Account record -----------------------------------------------------------------------------------------------

export const ACCOUNT_LIMITS = { perIpPerHour: 10, perUidPerHour: 5, windowMs: 60 * 60 * 1000 } as const;

// The record written the first time a phone account is seen. Only the fields the admin Customers list reads, plus the
// shop's own role and source. No name, email or address: sign-up asks for the phone number alone.
export interface AccountRecord {
  uid: string;
  phone: string;
  phoneVerified: true;
  source: "web_shop";
  createdAt: number;
  lastActiveAt: number;
  role: "customer";
  onboardingCompleted: false;
  consents: { marketing: false; analytics: false };
  consentTimestamp: number;
}

export function accountRecord(uid: string, phoneE164: string, now: number): AccountRecord {
  return {
    uid,
    phone: phoneE164,
    phoneVerified: true,
    source: "web_shop",
    createdAt: now,
    lastActiveAt: now,
    role: "customer",
    onboardingCompleted: false,
    consents: { marketing: false, analytics: false },
    consentTimestamp: now,
  };
}

export type AccountWritePlan =
  | { kind: "create"; record: AccountRecord }
  | { kind: "existing"; update: { lastActiveAt: number } };

// An account that exists is never overwritten: only its last activity moves. Creating is the only full write.
export function planAccountWrite(existing: Record<string, unknown> | undefined, uid: string, phoneE164: string, now: number): AccountWritePlan {
  if (existing) return { kind: "existing", update: { lastActiveAt: now } };
  return { kind: "create", record: accountRecord(uid, phoneE164, now) };
}

// ---- ID token ------------------------------------------------------------------------------------------------------

export interface DecodedClaims {
  uid?: unknown;
  firebase?: { sign_in_provider?: unknown };
  phone_number?: unknown;
}

export type PhoneTokenCheck =
  | { ok: true; uid: string; phone: string }
  | { ok: false; status: 403 | 400; error: string };

// Only a token from a phone sign-in creates an account, and the phone number comes from the verified token claim.
export function phoneAccountClaims(claims: DecodedClaims): PhoneTokenCheck {
  if (claims.firebase?.sign_in_provider !== "phone") {
    return { ok: false, status: 403, error: "Sign in with your mobile number to create an account." };
  }
  const uid = typeof claims.uid === "string" ? claims.uid : "";
  if (!uid || uid.length > 128) return { ok: false, status: 403, error: "Sign in again to continue." };
  const phone = indianE164(claims.phone_number);
  if (!phone || phone !== claims.phone_number) {
    return { ok: false, status: 400, error: "Use an Indian mobile number to create an account." };
  }
  return { ok: true, uid, phone };
}

// ---- Profile phone -------------------------------------------------------------------------------------------------

// A verified number changes only through sign-in with the new number, so a profile save cannot clear the verification.
export function phoneChangeAllowed(verified: boolean, storedPhone: string, requestedPhone: string): boolean {
  return !verified || storedPhone === requestedPhone;
}

// A request body may repeat the phone number (the mobile app sends it). When it does, it must be the verified claim's
// number; the claim is always the source of truth.
export function bodyPhoneMatches(body: unknown, verifiedPhone: string): boolean {
  const phone = body !== null && typeof body === "object" ? (body as { phone?: unknown }).phone : undefined;
  if (phone === undefined) return true;
  return indianE164(phone) === verifiedPhone;
}
