// Pure rules and wording for the phone sign-in screens. The number and code checks are the shared ones in
// lib/shop/account/rules (the server applies the same checks). No React, no Firebase imports.
import { indianE164, otpCode, OTP_LENGTH } from '@/lib/shop/account/rules';

export { indianE164, otpCode, OTP_LENGTH };

export const RESEND_SECONDS = 30;

export const PHONE_INPUT_ERROR = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
export const CODE_INPUT_ERROR = `Enter the ${OTP_LENGTH}-digit code from the SMS.`;
export const NOT_SWITCHED_ON = 'Phone sign-in is not switched on yet. Please try again later.';

// The screen shows the last four digits only, never the whole number.
export const maskedPhone = (e164: string): string => `+91 ••••• ${e164.slice(-4)}`;

// Friendly text for a failed send (Firebase error code, e.g. auth/invalid-phone-number).
export function sendErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return "That phone number doesn't look right. Check it and try again.";
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return NOT_SWITCHED_ON;
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a while, then try again.';
    case 'auth/quota-exceeded':
      return 'We cannot send codes right now. Try again later.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'The security check did not pass. Try again.';
    case 'auth/network-request-failed':
      return 'Check your internet connection and try again.';
    default:
      return 'We could not send the code. Try again.';
  }
}

// Friendly text for a failed check of the code (or a code that cannot be checked any more).
export function verifyErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-verification-code':
    case 'auth/missing-verification-code':
      return 'That code is wrong. Check the SMS and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'This code has expired. Request a new one.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a while, then try again.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return NOT_SWITCHED_ON;
    case 'auth/network-request-failed':
      return 'Check your internet connection and try again.';
    default:
      return 'We could not check the code. Try again.';
  }
}

// A code that can no longer be checked: the person must request a new one.
export function needsNewCode(code: string | undefined): boolean {
  return code === 'auth/code-expired' || code === 'auth/session-expired' || code === 'auth/no-pending-code';
}
