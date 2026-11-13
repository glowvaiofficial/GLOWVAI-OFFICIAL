// Signed, short-lived preview links for staff. The admin panel mints a token; the shop checks it here. Token format:
//   body = base64url(JSON.stringify({ exp, scope: 'home-preview' }))
//   sig  = base64url(HMAC-SHA256(PREVIEW_SECRET, body))
//   token = body + '.' + sig
// A valid token lets the page show the DRAFT homepage sections. Without one, customers only ever see published sections.
import { createHmac, timingSafeEqual } from "node:crypto";

export const HOME_PREVIEW_SCOPE = "home-preview";

export function verifyHomePreviewToken(token: string | null | undefined, now: number, secret: string | undefined): boolean {
  if (!token || !secret || secret.length < 32) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  if (!body || !sig || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(sig)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  let payload: { exp?: unknown; scope?: unknown };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  return typeof payload.exp === "number" && payload.exp > now && payload.scope === HOME_PREVIEW_SCOPE;
}
