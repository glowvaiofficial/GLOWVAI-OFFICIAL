// Saved delivery addresses (users/{uid}/addresses/{addressId}). Pure rules: no Firestore, no server imports. The
// address route reads the customer's addresses inside a transaction, calls applyAddressOp, and writes exactly the
// changes it returns, plus the default address into users.address (the field the GlowVai admin panel reads).
import { indianMobile, text } from "./text";

export const MAX_ADDRESSES = 5;
export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

// The fields a customer types. Same limits as the profile route (fullAddress 8-300, pincode 6 digits, landmark 120).
export interface AddressFields {
  label: AddressLabel;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  landmark: string;
}

export interface StoredAddress extends AddressFields {
  id: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// The shape users.address has for the admin panel (same four fields the profile route writes).
export interface UserAddress {
  fullAddress: string;
  city: string;
  pincode: string;
  landmark: string;
}

export type AddressOp =
  | { kind: "create"; input: unknown; makeDefault?: boolean }
  | { kind: "update"; id: string; input: unknown; makeDefault?: boolean }
  | { kind: "setDefault"; id: string }
  | { kind: "delete"; id: string };

export type AddressChange = { kind: "upsert"; address: StoredAddress } | { kind: "delete"; id: string };

export type AddressOutcome =
  | { ok: true; addresses: StoredAddress[]; changes: AddressChange[]; userAddress: UserAddress | null }
  | { ok: false; status: number; error: string };

export const ADDRESS_ID = /^adr_[a-f0-9]{16}$/;

export function validateAddressFields(input: unknown, base?: AddressFields): { ok: true; value: AddressFields } | { ok: false; error: string } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const pick = (key: keyof AddressFields, fallback: string) => (key in raw ? raw[key] : fallback);
  const label = String(pick("label", base?.label ?? "Home")).trim();
  if (!(ADDRESS_LABELS as readonly string[]).includes(label)) return { ok: false, error: "Choose Home, Work or Other." };
  const recipientName = text(pick("recipientName", base?.recipientName ?? ""), 80);
  if (recipientName.length < 2) return { ok: false, error: "Enter the name for delivery." };
  const phone = indianMobile(pick("phone", base?.phone ?? ""));
  if (!phone) return { ok: false, error: "Enter a 10-digit Indian mobile number." };
  const fullAddress = text(pick("fullAddress", base?.fullAddress ?? ""), 300);
  if (fullAddress.length < 8) return { ok: false, error: "Enter the full address (at least 8 characters)." };
  const city = text(pick("city", base?.city ?? ""), 60);
  if (!city) return { ok: false, error: "Enter the city." };
  // Not cut to a length: a 7-digit pincode is refused, not shortened into a different one.
  const pincode = String(pick("pincode", base?.pincode ?? "")).trim();
  if (!/^\d{6}$/.test(pincode)) return { ok: false, error: "Enter a 6-digit pincode." };
  const landmark = text(pick("landmark", base?.landmark ?? ""), 120);
  return { ok: true, value: { label: label as AddressLabel, recipientName, phone, fullAddress, city, pincode, landmark } };
}

// The default address as users.address, or null when the customer has no saved address.
export function userAddressOf(addresses: StoredAddress[]): UserAddress | null {
  const d = addresses.find((a) => a.isDefault);
  return d ? { fullAddress: d.fullAddress, city: d.city, pincode: d.pincode, landmark: d.landmark } : null;
}

// Sorted for display: the default first, then the order they were added.
export function sortAddresses(addresses: StoredAddress[]): StoredAddress[] {
  return [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function countDefaults(addresses: StoredAddress[]): number {
  return addresses.filter((a) => a.isDefault).length;
}

const fail = (status: number, error: string): AddressOutcome => ({ ok: false, status, error });

// Applies one customer operation to the customer's current addresses. Every rule lives here:
// - at most MAX_ADDRESSES addresses,
// - exactly one default whenever there is at least one address (the first address is the default; the default cannot
//   be unset directly, another address has to be made the default instead; deleting the default promotes the most
//   recently changed address),
// - a request for an id the customer does not have is "not found", so a customer can only change their own addresses.
export function applyAddressOp(current: StoredAddress[], op: AddressOp, now: number, newId: string): AddressOutcome {
  // Repairs data that somehow has no default, so the one-default rule holds after every operation.
  let list = sortAddresses(current).map((a) => ({ ...a }));
  const changed = new Map<string, StoredAddress>();
  const removed = new Set<string>();
  const touch = (a: StoredAddress, patch: Partial<StoredAddress>) => {
    const next = { ...a, ...patch, updatedAt: now };
    changed.set(a.id, next);
    list = list.map((x) => (x.id === a.id ? next : x));
  };
  if (list.length > 0 && countDefaults(list) === 0) touch(list[0], { isDefault: true });

  const makeDefault = (id: string) => {
    for (const a of list) if (a.isDefault && a.id !== id) touch(a, { isDefault: false });
    const target = list.find((a) => a.id === id);
    if (target && !target.isDefault) touch(target, { isDefault: true });
  };

  if (op.kind === "create") {
    if (list.length >= MAX_ADDRESSES) return fail(409, `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
    const v = validateAddressFields(op.input);
    if (!v.ok) return fail(400, v.error);
    const isDefault = list.length === 0 || op.makeDefault === true;
    const address: StoredAddress = { id: newId, ...v.value, isDefault: false, createdAt: now, updatedAt: now };
    list = [...list, address];
    changed.set(newId, address);
    if (isDefault) makeDefault(newId);
  } else if (op.kind === "update") {
    const target = list.find((a) => a.id === op.id);
    if (!target) return fail(404, "That address is not on your account.");
    const v = validateAddressFields(op.input, target);
    if (!v.ok) return fail(400, v.error);
    touch(target, { ...v.value });
    if (op.makeDefault === true) makeDefault(op.id);
    if (op.makeDefault === false && target.isDefault) return fail(409, "Choose another address as your default first.");
  } else if (op.kind === "setDefault") {
    if (!list.some((a) => a.id === op.id)) return fail(404, "That address is not on your account.");
    makeDefault(op.id);
  } else {
    const target = list.find((a) => a.id === op.id);
    if (!target) return fail(404, "That address is not on your account.");
    removed.add(op.id);
    list = list.filter((a) => a.id !== op.id);
    changed.delete(op.id);
    if (target.isDefault && list.length > 0) {
      const promoted = [...list].sort((a, b) => b.updatedAt - a.updatedAt || a.createdAt - b.createdAt)[0];
      touch(promoted, { isDefault: true });
    }
  }

  const addresses = sortAddresses(list);
  const changes: AddressChange[] = [
    ...[...changed.values()].filter((a) => !removed.has(a.id)).map((address) => ({ kind: "upsert" as const, address })),
    ...[...removed].map((id) => ({ kind: "delete" as const, id })),
  ];
  return { ok: true, addresses, changes, userAddress: userAddressOf(addresses) };
}
