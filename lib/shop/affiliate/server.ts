// Server-only affiliate helpers that need the Firebase Admin SDK: the customer's eligibility from their account record.
import "server-only";
import { adminAuth } from "../server";
import { affiliateEligibility, type Eligibility } from "./application";

// Verified email, or an account that has existed for the minimum number of days (see application.ts). An account the
// server cannot read is not eligible.
export async function customerEligibility(uid: string, now: number): Promise<Eligibility> {
  const user = await adminAuth()
    .getUser(uid)
    .catch(() => null);
  const created = user?.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Number.NaN;
  return affiliateEligibility({
    emailVerified: user?.emailVerified === true,
    accountCreatedAt: Number.isFinite(created) ? created : null,
    now,
  });
}
