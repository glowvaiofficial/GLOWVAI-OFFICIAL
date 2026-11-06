// Constant-time comparison for shared secrets (the cron bearer token). Both values are hashed first, so the comparison
// takes the same time whatever the lengths are and never leaks how much of the secret matched.
import { createHash, timingSafeEqual } from "node:crypto";

export function sameSecret(provided: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b) && provided.length === expected.length;
}

// The bearer token from an Authorization header, or "".
export function bearerToken(header: string | null): string {
  return header && header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
