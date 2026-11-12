import { NextRequest } from "next/server";
import { adminAuth, json } from "@/lib/shop/server";
import { currentDeviceHash, gate } from "@/lib/shop/privacy/http";
import { DEVICE_CAP, sortDevices } from "@/lib/shop/privacy/rules";
import { listDeviceRecords } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// The account's devices: a coarse name ("Chrome on Android"), when each was first and last seen, and which one is this
// device. Devices are recorded on the session-establishing calls (see lib/shop/privacy/sightings.ts).
export async function GET(req: NextRequest) {
  const g = await gate(req, "devices-get", 60);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const current = currentDeviceHash(req, uid);
  const [records, user] = await Promise.all([listDeviceRecords(uid), adminAuth().getUser(uid).catch(() => null)]);
  const devices = sortDevices(records).map((d) => ({
    id: d.hash,
    name: d.name,
    firstSeenAt: d.firstSeenAt,
    lastSeenAt: d.lastSeenAt,
    current: d.hash === current,
  }));
  const lastSignInMs = user?.metadata?.lastSignInTime ? Date.parse(user.metadata.lastSignInTime) : NaN;
  return json({
    ok: true,
    devices,
    max: DEVICE_CAP,
    lastSignInAt: Number.isFinite(lastSignInMs) ? lastSignInMs : null,
    guest: g.anonymous,
  });
}
