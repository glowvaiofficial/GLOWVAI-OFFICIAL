// Reads the vendor's application and the admin overlay (2 document reads), with a 30-second per-instance cache so
// polling screens do not spend the shared free Firestore quota. Writes made by this server update the cache directly.
import "server-only";
import { db } from "@/lib/shop/server";
import { applicationIdFor, operatingVendor, toVendorMe, type OperatingVendor, type VendorMe } from "./state";

type Doc = Record<string, unknown>;

export interface VendorRecord {
  uid: string;
  app: Doc | null;
  overlay: Doc | null;
  at: number;
}

const CACHE_MS = 30_000;
const MAX_ENTRIES = 1000;
const cache = new Map<string, VendorRecord>();

export const applicationRef = (uid: string) => db().collection("vendorApplications").doc(applicationIdFor(uid));
export const overlayRef = (uid: string) => db().collection("admin_vendors").doc(applicationIdFor(uid));
export const inventoryCol = (uid: string) => db().collection("vendors").doc(uid).collection("vendorInventory");

export function remember(uid: string, app: Doc | null, overlay: Doc | null): VendorRecord {
  const record = { uid, app, overlay, at: Date.now() };
  cache.delete(uid);
  cache.set(uid, record);
  // Map keeps insertion order: drop the oldest entries.
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  return record;
}

export function forget(uid: string) {
  cache.delete(uid);
}

export async function loadVendor(uid: string, opts: { fresh?: boolean } = {}): Promise<VendorRecord> {
  const hit = cache.get(uid);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_MS) return hit;
  const [app, overlay] = await db().getAll(applicationRef(uid), overlayRef(uid));
  return remember(uid, app.exists ? (app.data() as Doc) : null, overlay.exists ? (overlay.data() as Doc) : null);
}

/** Applies fields this server just wrote to the application doc to the cached copy. */
export function patchCachedApplication(uid: string, patch: Doc) {
  const hit = cache.get(uid);
  if (hit?.app) remember(uid, { ...hit.app, ...patch }, hit.overlay);
  else forget(uid);
}

export const meOf = (r: VendorRecord): VendorMe => toVendorMe(r.uid, r.app, r.overlay);
export const operatorOf = (r: VendorRecord): OperatingVendor => operatingVendor(r.uid, r.app, r.overlay);
