import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { currentDeviceHash, gate } from "@/lib/shop/privacy/http";
import { isDeviceHash } from "@/lib/shop/privacy/rules";
import { logActivity, removeDevice } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// Removes one device from the list. "Sign out this device" calls this and then signs the browser out; the browser's own
// sign-out is done on the client. Only the owner's device list is touched.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ hash: string }> }) {
  const g = await gate(req, "devices-delete", 20);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const { hash } = await ctx.params;
  if (!isDeviceHash(hash)) return json({ ok: false, error: "That device is not on your account." }, 404);
  const removed = await removeDevice(uid, hash);
  if (!removed) return json({ ok: false, error: "That device is not on your account." }, 404);
  const wasThis = currentDeviceHash(req, uid) === hash;
  await logActivity(uid, "DEVICE_REMOVED", wasThis ? "This device signed out" : "A device was removed", Date.now());
  return json({ ok: true, wasThisDevice: wasThis });
}
