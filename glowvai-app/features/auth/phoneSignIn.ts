// Phone sign-in on the web: an invisible reCAPTCHA, an SMS code, and the code check (Firebase Auth, project glowvai-38bde).
// The confirmation object lives in memory only (never in storage or a URL), so a reload on the code screen asks for the
// number again. Nothing here logs the number or the code.
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '../../core/config/firebase';
import { sendErrorMessage, verifyErrorMessage, needsNewCode } from './phoneAuthRules';

export const RECAPTCHA_CONTAINER_ID = 'glowvai-recaptcha';

interface PendingCode {
  e164: string;
  confirmation: ConfirmationResult;
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
