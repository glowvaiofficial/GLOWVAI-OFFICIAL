// Small helpers the privacy routes share. Server only.
import "server-only";
import type { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser } from "../server";
import { deviceHash, isDeviceId } from "./rules";

export const DEVICE_HEADER = "x-glowvai-device";

// The signed-in customer, or the response to send back (rate limit or sign-in). Checked before any work.
export async function gate(req: NextRequest, route: string, perMinute: number) {
  const ipLimited = limitByIp(req, route, perMinute);
  if (ipLimited) return { response: ipLimited, uid: null, anonymous: false };
  const customer = await customerFrom(req);
  if (!customer) return { response: json({ ok: false, error: "Sign in again to continue." }, 401), uid: null, anonymous: false };
  const userLimited = limitByUser(customer.uid, route, perMinute);
  if (userLimited) return { response: userLimited, uid: null, anonymous: false };
  return { response: null, uid: customer.uid, anonymous: customer.anonymous };
}

// The stored key for this browser's device on this account, or null when the request carries no valid device id.
export function currentDeviceHash(req: NextRequest, uid: string): string | null {
  const raw = req.headers.get(DEVICE_HEADER) ?? "";
  return isDeviceId(raw) ? deviceHash(uid, raw) : null;
}

// The device name from the user agent, coarse (see coarseDeviceName). Read on the server; the header is not trusted for it.
export function userAgentOf(req: NextRequest): string {
  return (req.headers.get("user-agent") ?? "").slice(0, 400);
}
