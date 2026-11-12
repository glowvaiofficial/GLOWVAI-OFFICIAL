// Vendor device push tokens: vendors/{uid}/pushTokens/{sha256(token)}. Admin SDK only; clients never reach this path.
// The cap and the eviction rule are in pushToken.ts (pure); this file only reads, writes and commits them.
import "server-only";
import { db } from "@/lib/shop/server";
import type { VendorPushTokenInput } from "./pushToken";
import { planVendorDevices, vendorPushTokenId } from "./pushToken";

// Saves the device's token for the vendor and removes the least recently refreshed device when the cap is reached.
// Returns how many devices the vendor has registered afterwards. Nothing about the tokens is returned to the caller.
export async function saveVendorPushToken(uid: string, input: VendorPushTokenInput, now: number): Promise<{ devices: number }> {
  const store = db();
  const col = store.collection("vendors").doc(uid).collection("pushTokens");
  const id = vendorPushTokenId(input.token);
  return store.runTransaction(async (tx) => {
    // Reads the oldest 60 device records: far more than the cap, so the plan sees every device that matters.
    const existing = await tx.get(col.orderBy("updatedAt", "asc").limit(60));
    const stored = existing.docs.map((d) => ({ id: d.id, updatedAt: Number(d.data().updatedAt) || 0 }));
    const plan = planVendorDevices(stored, input.token);
    for (const evict of plan.evict) tx.delete(col.doc(evict));
    const alreadyRegistered = stored.some((s) => s.id === id);
    tx.set(
      col.doc(id),
      { token: input.token, platform: input.platform, tokenType: input.tokenType, updatedAt: now, ...(alreadyRegistered ? {} : { createdAt: now }) },
      { merge: true },
    );
    return { devices: plan.devices };
  });
}
