// Records this browser as a device of the account. Called from the session-establishing routes (the profile read and the
// push-token registration). It never fails the call it is attached to: a device list problem must not block sign-in.
import "server-only";
import type { NextRequest } from "next/server";
import { currentDeviceHash, userAgentOf } from "./http";
import { coarseDeviceName } from "./rules";
import { recordSighting } from "./store";

export async function noteDeviceSighting(req: NextRequest, uid: string): Promise<void> {
  try {
    const hash = currentDeviceHash(req, uid);
    if (!hash) return;
    await recordSighting(uid, hash, coarseDeviceName(userAgentOf(req)), Date.now());
  } catch {
    // Deliberately silent: no device id, user agent or error text is logged here.
  }
}
