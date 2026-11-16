// Phone sign-in on the web: an invisible reCAPTCHA, an SMS code, and the code check (Firebase Auth, project glowvai-38bde).
// The confirmation object lives in memory only (never in storage or a URL), so a reload on the code screen asks for the
// number again. Nothing here logs the number or the code.
import { RecaptchaVerifier, signInWithCustomToken, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '../../core/config/firebase';
import { sendErrorMessage, verifyErrorMessage, needsNewCode } from './phoneAuthRules';

export const RECAPTCHA_CONTAINER_ID = 'glowvai-recaptcha';

interface PendingCode {
  e164: string;
  // Null in httpSMS mode: the code is checked by our own server (/api/auth/otp/verify), not by Firebase.
  confirmation: ConfirmationResult | null;
}

// NEXT_PUBLIC_OTP_PROVIDER=httpsms sends the SMS through our server and signs in with a custom token. Default: Firebase.
export const useHttpSms = (): boolean => process.env.NEXT_PUBLIC_OTP_PROVIDER === 'httpsms';

// Maps the server's error names onto the Firebase codes the existing wording is keyed by.
const SERVER_CODES: Record<string, string> = {
  INVALID_PHONE: 'auth/invalid-phone-number',
  INVALID_CODE: 'auth/invalid-verification-code',
  CODE_WRONG: 'auth/invalid-verification-code',
  CODE_EXPIRED: 'auth/code-expired',
  TOO_MANY_ATTEMPTS: 'auth/too-many-requests',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  COOLDOWN: 'auth/too-many-requests',
  DAILY_LIMIT: 'auth/quota-exceeded',
  OTP_NOT_CONFIGURED: 'auth/operation-not-allowed',
};

async function callOtp(
  path: 'request' | 'verify',
  body: Record<string, string>,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; code: string }> {
  try {
    const res = await fetch(`/api/auth/otp/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && data.ok === true) return { ok: true, data };
    const name = typeof data.error === 'string' ? data.error : '';
    return { ok: false, code: SERVER_CODES[name] ?? 'otp/failed' };
  } catch {
    return { ok: false, code: 'auth/network-request-failed' };
  }
}

let verifier: RecaptchaVerifier | null = null;
let pending: PendingCode | null = null;

export type PhoneResult = { ok: true } | { ok: false; error: string; restart?: boolean };

// Clears the reCAPTCHA so the next attempt starts clean (a failed attempt leaves the widget in a bad state).
function resetVerifier(): void {
  try {
    verifier?.clear();
  } catch {
    // Already cleared or removed from the page.
  }
  verifier = null;
}

// Sends an SMS code to an E.164 number (+91XXXXXXXXXX). Used for the first send and for a resend.
export async function sendPhoneCode(e164: string): Promise<PhoneResult> {
  if (!auth) return { ok: false, error: 'Sign-in is not available right now. Please try again later.' };
  if (useHttpSms()) {
    const sent = await callOtp('request', { phone: e164 });
    if (!sent.ok) {
      pending = null;
      return { ok: false, error: sendErrorMessage(sent.code) };
    }
    pending = { e164, confirmation: null };
    return { ok: true };
  }
  try {
    if (!verifier) {
      verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
    }
    const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
    pending = { e164, confirmation };
    return { ok: true };
  } catch (err) {
    resetVerifier();
    pending = null;
    return { ok: false, error: sendErrorMessage(codeOf(err)) };
  }
}

// Checks the 6-digit code for the pending number. Success signs the phone account in.
export async function confirmPhoneCode(code: string): Promise<PhoneResult> {
  if (!pending) return { ok: false, error: 'Request a new code to continue.', restart: true };
  if (!pending.confirmation) {
    const checked = await callOtp('verify', { phone: pending.e164, code });
    if (!checked.ok) {
      if (needsNewCode(checked.code)) pending = null;
      return { ok: false, error: verifyErrorMessage(checked.code), restart: needsNewCode(checked.code) };
    }
    try {
      if (!auth) throw new Error('no auth');
      await signInWithCustomToken(auth, String(checked.data.customToken));
      pending = null;
      return { ok: true };
    } catch (err) {
      return { ok: false, error: verifyErrorMessage(codeOf(err)) };
    }
  }
  try {
    await pending.confirmation.confirm(code);
    pending = null;
    return { ok: true };
  } catch (err) {
    const issue = codeOf(err);
    if (needsNewCode(issue)) pending = null;
    return { ok: false, error: verifyErrorMessage(issue), restart: needsNewCode(issue) };
  }
}

// The number the pending code was sent to, or null when there is no pending code.
export function pendingPhone(): string | null {
  return pending?.e164 ?? null;
}

export function hasPendingCode(): boolean {
  return pending !== null;
}

// The Firebase error code (auth/...) of a thrown value, when it has one.
function codeOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}
