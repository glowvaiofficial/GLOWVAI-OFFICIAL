// Where /vendor sends a visitor. One pure decision function, so the rules can be tested as a table (see the test file).
// Order: auth state first, then the email check, then the store state from GET /api/vendor/me.

import { friendlyMessage } from "./errors";
import type { VendorStateName } from "./types";

export const VENDOR_HOME_ROUTES = {
  signIn: "/vendor/sign-in",
  verifyEmail: "/vendor/verify-email",
  onboarding: "/vendor/onboarding",
  status: "/vendor/status",
  /** Owned by the operations team (app/vendor/(ops)). */
  home: "/vendor/home",
} as const;

export type AuthPhase = "loading" | "signed-out" | "signed-in";

export interface RoutingInput {
  auth: AuthPhase;
  /** From GET /me. Null until it has loaded (or when it failed). */
  state?: VendorStateName | null;
  /** From the account in GET /me. Null until loaded. */
  emailVerified?: boolean | null;
  /** The code of a failed GET /me (see lib/vendor-web/errors.ts), or null. */
  errorCode?: string | null;
}

export type RouteDecision =
  | { kind: "wait" }
  | { kind: "redirect"; href: string }
  | { kind: "notice"; message: string };

/** The page each store state belongs on, after sign-in and email checks. */
export function routeForState(state: VendorStateName): string {
  switch (state) {
    case "NO_APPLICATION":
      return VENDOR_HOME_ROUTES.onboarding;
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "DOCUMENTS_REQUESTED":
    case "REJECTED":
    case "SUSPENDED":
      return VENDOR_HOME_ROUTES.status;
    case "APPROVED_ACTIVE":
    case "APPROVED_PAUSED":
      return VENDOR_HOME_ROUTES.home;
    default:
      return VENDOR_HOME_ROUTES.status;
  }
}

export function decideVendorRoute(input: RoutingInput): RouteDecision {
  if (input.auth === "loading") return { kind: "wait" };
  if (input.auth === "signed-out") return { kind: "redirect", href: VENDOR_HOME_ROUTES.signIn };

  if (input.errorCode) {
    // The session is no good any more: sign in again rather than show a dead end.
    if (input.errorCode === "UNAUTHENTICATED" || input.errorCode === "NOT_A_VENDOR_ACCOUNT") {
      return { kind: "redirect", href: VENDOR_HOME_ROUTES.signIn };
    }
    return { kind: "notice", message: friendlyMessage(input.errorCode) };
  }

  if (input.emailVerified === null || input.emailVerified === undefined || !input.state) return { kind: "wait" };
  if (!input.emailVerified) return { kind: "redirect", href: VENDOR_HOME_ROUTES.verifyEmail };
  return { kind: "redirect", href: routeForState(input.state) };
}
