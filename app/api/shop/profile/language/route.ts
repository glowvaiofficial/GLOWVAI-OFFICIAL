import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { recordActivity } from "@/lib/shop/activity";
import { isLanguageCode } from "@/lib/shop/settings/rules";

export const dynamic = "force-dynamic";

// The customer's language for the shop (users/{uid}.language). Only the codes in LANGUAGE_CODES are accepted.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "language-post", 20);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "language-post", 30);
  if (userLimited) return userLimited;
  if (tooMany(`language:${customer.uid}`, 30, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Invalid request." }, 400);
  if (!isLanguageCode(body.language)) return json({ ok: false, error: "Choose English, Hindi or Telugu.", field: "language" }, 400);

  const now = Date.now();
  await db().collection("users").doc(customer.uid).set({ uid: customer.uid, language: body.language, updatedAt: now }, { merge: true });
  await recordActivity(customer.uid, "language_changed", now);
  return json({ ok: true, language: body.language });
}
