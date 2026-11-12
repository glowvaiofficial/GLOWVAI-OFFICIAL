import { NextRequest } from "next/server";
import { adminAuth, json, tooMany } from "@/lib/shop/server";
import { currentDeviceHash, gate } from "@/lib/shop/privacy/http";
import { logActivity, removeOtherDevices } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// Signs out every other device of the account. Firebase Admin revokes the account's refresh tokens, which ends every
// session, this device's included. The browser therefore signs out here too, and the customer must start a new session.
// For a guest (anonymous) account the new session is a new account, so the order history stays with the old one.
export async function POST(req: NextRequest) {
  const g = await gate(req, "devices-sign-out-others", 10);
  if (g.response) return g.response;
  const uid = g.uid as string;
  if (tooMany(`sign-out-others:${uid}`, 5, 60 * 60 * 1000)) return json({ ok: false, error: "Too many sign-outs. Try again later." }, 429);
  const now = Date.now();
  await adminAuth().revokeRefreshTokens(uid);
  const removed = await removeOtherDevices(uid, currentDeviceHash(req, uid) ?? "");
  await logActivity(uid, "SIGNED_OUT_OTHER_DEVICES", `${removed} other device${removed === 1 ? "" : "s"} signed out`, now);
  return json({ ok: true, removed, sessionEnded: true });
}
