import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { isPushToken, MAX_TOKENS_PER_USER } from "@/lib/shop/notifications/policy";
import { removeToken, saveToken } from "@/lib/shop/notifyStore";

export const dynamic = "force-dynamic";

// Registers or removes this device's push token for the signed-in customer. The token is stored under users/{uid}/
// pushTokens/{sha256(token)}, so only the owner's own device list ever holds it. Responses never include a token.
// Ten changes an hour per customer: a device registers once and then only refreshes when the browser rotates it.
const HOUR = 60 * 60 * 1000;

async function gate(req: NextRequest) {
  const ipLimited = limitByIp(req, "notify-token", 30);
  if (ipLimited) return { response: ipLimited, customer: null };
  const customer = await customerFrom(req);
  if (!customer) return { response: json({ ok: false, error: "Sign in again to continue." }, 401), customer: null };
  const userLimited = limitByUser(customer.uid, "notify-token", 10, HOUR);
  if (userLimited) return { response: userLimited, customer: null };
  return { response: null, customer };
}

export async function POST(req: NextRequest) {
  const { response, customer } = await gate(req);
  if (response) return response;
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!body || !isPushToken(body.token)) return json({ ok: false, error: "Invalid device token." }, 400);
  await saveToken(customer.uid, body.token, Date.now());
  return json({ ok: true, maxDevices: MAX_TOKENS_PER_USER });
}

export async function DELETE(req: NextRequest) {
  const { response, customer } = await gate(req);
  if (response) return response;
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!body || !isPushToken(body.token)) return json({ ok: false, error: "Invalid device token." }, 400);
  await removeToken(customer.uid, body.token);
  return json({ ok: true });
}
