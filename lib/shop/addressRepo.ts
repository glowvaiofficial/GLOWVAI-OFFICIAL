// Firestore storage for saved addresses: users/{uid}/addresses/{addressId}. Server only. Every path starts from the uid of
// the verified ID token, so a request can never reach another customer's addresses.
import "server-only";
import { randomBytes } from "node:crypto";
import { AREA_DELIVERY_FEES } from "@/glowvai-app/shared/pricing-rules.mjs";
import { db } from "./server";
import { MAX_ADDRESSES, validateAddressFields, type StoredAddress, type AddressChange } from "./addressRules";
import type { AddressRepo } from "./addressService";

const addressesOf = (uid: string) => db().collection("users").doc(uid).collection("addresses");

function fromDoc(id: string, d: Record<string, unknown>): StoredAddress {
  return {
    id,
    label: (d.label as StoredAddress["label"]) ?? "Home",
    recipientName: String(d.recipientName ?? ""),
    phone: String(d.phone ?? ""),
    fullAddress: String(d.fullAddress ?? ""),
    city: String(d.city ?? ""),
    pincode: String(d.pincode ?? ""),
    landmark: String(d.landmark ?? ""),
    isDefault: d.isDefault === true,
    createdAt: Number(d.createdAt) || 0,
    updatedAt: Number(d.updatedAt) || 0,
  };
}

function toDoc(a: StoredAddress): Record<string, unknown> {
  const { id: _id, ...rest } = a;
  return rest;
}

export const newAddressId = (): string => `adr_${randomBytes(8).toString("hex")}`;

// Reads and writes the customer's addresses. A transaction reads the addresses (and the user document) first, runs the
// rules, and writes only the changes the rules return. users.address is kept equal to the default address, but only
// when the user document already exists, so this route never creates a profile on its own.
export const addressRepo: AddressRepo = {
  async list(uid) {
    const snap = await addressesOf(uid).limit(MAX_ADDRESSES).get();
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async transact(uid, work) {
    const store = db();
    const userRef = store.collection("users").doc(uid);
    return store.runTransaction(async (tx) => {
      const [addressSnap, userSnap] = await Promise.all([tx.get(addressesOf(uid).limit(MAX_ADDRESSES)), tx.get(userRef)]);
      const current = addressSnap.docs.map((d) => fromDoc(d.id, d.data()));
      const outcome = work(current);
      if (!outcome.ok) return outcome;
      const now = Date.now();
      for (const change of outcome.changes as AddressChange[]) {
        if (change.kind === "upsert") tx.set(addressesOf(uid).doc(change.address.id), toDoc(change.address));
        else tx.delete(addressesOf(uid).doc(change.id));
      }
      if (outcome.changes.length > 0 && userSnap.exists) {
        tx.update(userRef, { address: outcome.userAddress, updatedAt: now });
      }
      return outcome;
    });
  },
};

// The delivery details of a saved address for placing an order. The order route re-validates these fields before it
// uses them. Null when the address is not this customer's (or not there any more).
export async function savedAddressForOrder(uid: string, addressId: string): Promise<
  | { ok: true; label: string; name: string; phone: string; fullAddress: string; city: string; pincode: string; landmark: string; area: string }
  | { ok: false }
> {
  const snap = await addressesOf(uid).doc(addressId).get();
  if (!snap.exists) return { ok: false };
  const a = fromDoc(snap.id, snap.data() ?? {});
  const v = validateAddressFields({ ...a });
  if (!v.ok) return { ok: false };
  const f = v.value;
  const area = AREA_DELIVERY_FEES.map(([name]) => String(name)).find((name) => f.fullAddress.toLowerCase().includes(name.toLowerCase())) ?? "";
  return { ok: true, label: f.label, name: f.recipientName, phone: f.phone, fullAddress: f.fullAddress, city: f.city, pincode: f.pincode, landmark: f.landmark, area };
}
