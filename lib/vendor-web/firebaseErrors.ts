// Friendly copy for Firebase Auth error codes (auth/...). Pure: takes the code string, so it can be tested without Firebase.

import { NETWORK_MESSAGE } from "./errors";

export const AUTH_NOT_ENABLED_MESSAGE = "Store sign-in is not switched on yet.";

const COPY: Record<string, string> = {
  "auth/invalid-credential": "That email and password do not match. Check them and try again, or reset your password.",
  "auth/wrong-password": "That password is not right. Try again, or reset your password.",
  "auth/invalid-password": "That password is not right. Try again, or reset your password.",
  "auth/user-not-found": "No store account uses this email yet. Create an account first.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/operation-not-allowed": AUTH_NOT_ENABLED_MESSAGE,
  "auth/network-request-failed": NETWORK_MESSAGE,
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account already uses this email. Sign in instead.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/user-disabled": "This account is disabled. Contact GlowVai support.",
  "auth/requires-recent-login": "For safety, enter your current password again.",
  "auth/user-token-expired": "Your session has ended. Please sign in again.",
  "auth/no-current-user": "Your session has ended. Please sign in again.",
  "auth/missing-password": "Enter your password.",
  "auth/app-deleted": "Store sign-in is not available right now. Try again later.",
};

export const AUTH_FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/** The sentence to show for a Firebase Auth error code. Unknown codes get the generic line, never the raw code. */
export function authErrorMessage(code: string | undefined | null): string {
  if (!code) return AUTH_FALLBACK_MESSAGE;
  return COPY[code] ?? AUTH_FALLBACK_MESSAGE;
}

/** Copy for a failed change-password step. Reauthentication reports a wrong current password as invalid-credential. */
export function changePasswordMessage(code: string): string {
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/invalid-password") {
    return "Your current password is not right.";
  }
  if (code === "auth/network-request-failed") return NETWORK_MESSAGE;
  return authErrorMessage(code);
}

/** Reads the code from an unknown thrown value (Firebase errors carry `code`). */
export function authCodeOf(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}
