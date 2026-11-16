// The delivery area a visitor without an account picked, kept on the device only. It is an area and a pincode, never a
// named address: it has no street, so checkout still asks for a real saved address. Pure parsing and building here;
// the storage calls take the storage object, so the rules are tested without a browser.
import type { Address } from '../../../types';
import { DELIVERY_ETA_MINUTES } from '../../../../lib/shop/delivery';

export const GUEST_AREA_KEY = 'glowvai_guest_area_v1';
export const GUEST_AREA_ID = 'guest-area';

export interface GuestArea {
  area: string;
  pincode: string;
}

// Vijayawada pincodes (520xxx), the same rule as the address store.
export const isServiceableAreaPincode = (pincode: string): boolean => /^520\d{3}$/.test(pincode.trim());

// The short area name shown in the header: the first part of the typed address.
export function areaNameOf(text: string): string {
  return text.split(',')[0].replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function parseGuestArea(raw: string | null): GuestArea | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<GuestArea>;
    const area = typeof v.area === 'string' ? areaNameOf(v.area) : '';
    const pincode = typeof v.pincode === 'string' ? v.pincode.trim() : '';
    if (!area || !/^\d{6}$/.test(pincode)) return null;
    return { area, pincode };
  } catch {
    return null;
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function readGuestArea(storage: StorageLike | undefined = safeStorage()): GuestArea | null {
  try {
    return parseGuestArea(storage ? storage.getItem(GUEST_AREA_KEY) : null);
  } catch {
    return null;
  }
}

export function saveGuestArea(value: GuestArea, storage: StorageLike | undefined = safeStorage()): void {
  try {
    storage?.setItem(GUEST_AREA_KEY, JSON.stringify({ area: areaNameOf(value.area), pincode: value.pincode.trim() }));
  } catch {
    // Storage blocked: the area is kept for this visit only.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

// The header address for a guest area. No street on purpose (see above).
export function guestAreaAddress(value: GuestArea): Address {
  return {
    id: GUEST_AREA_ID,
    label: 'Other',
    street: '',
    area: value.area,
    city: 'Vijayawada',
    pincode: value.pincode,
    serviceable: isServiceableAreaPincode(value.pincode),
    deliveryMinutes: DELIVERY_ETA_MINUTES,
    isDefault: false,
  };
}
