import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { prefsFrom } from "@/lib/shop/notifications/policy";
import { prefsFor, savePrefs } from "@/lib/shop/notifyStore";

export const dynamic = "force-dynamic";

// The customer's notification choices: orders, offers and reviews (users/{uid}.notificationPrefs). Offers only send
// pushes when marketing consent is also on (consents.marketing, set on the profile). Quiet hours always apply to pushes.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "notify-prefs-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "notify-prefs", 60);
  if (userLimited) return userLimited;
  const current = await prefsFor(customer.uid);
  return json({ ok: true, prefs: current.prefs, marketingConsent: current.marketingConsent });
}

export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "notify-prefs-post", 20);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "notify-prefs", 60);
  if (userLimited) return userLimited;
  if (tooMany(`notify-prefs-save:${customer.uid}`, 20, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const patch: Partial<Record<"orders" | "offers" | "reviews", boolean>> = {};
  for (const key of ["orders", "offers", "reviews"] as const) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "boolean") return json({ ok: false, error: "Each choice must be on or off." }, 400);
    patch[key] = body[key] as boolean;
  }
  const saved = await savePrefs(customer.uid, patch, Date.now());
  return json({ ok: true, prefs: prefsFrom(saved) });
}
