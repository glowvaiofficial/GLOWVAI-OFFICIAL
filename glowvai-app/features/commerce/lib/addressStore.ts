import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Address } from '../../../types';
import { VIJAYAWADA_AREAS } from '../../../data/serviceability';

// Full address details (recipient, phone, coordinates) that the NOV Address model does not carry.
export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  recipientName: string;
  phoneNumber: string;
  houseNo: string;
  buildingName?: string;
  landmark?: string;
  areaAddress: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  deliveryInstructions?: string;
  isDefault: boolean;
}

// What checkout, express and order placement read from, whichever source the address came from.
export interface DeliveryAddress {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  fullAddress: string;
  landmark?: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  deliveryInstructions?: string;
  serviceable: boolean;
  // Delivery estimate for the matched service area, when the address falls in one. Unknown otherwise.
  etaMinutes?: number;
}

// Vijayawada service area: 520xxx pincodes.
export const isServiceablePincode = (pincode: string): boolean => /^520\d{3}$/.test(pincode.trim());

// Service areas, longest name first, matched by name inside the address text.
const AREAS_BY_LENGTH = [...VIJAYAWADA_AREAS].sort((a, b) => b.name.length - a.name.length);
export const etaMinutesFor = (text: string): number | undefined => {
  const haystack = text.toLowerCase();
  const match = AREAS_BY_LENGTH.find((area) => area.quickCommerceAvailable && haystack.includes(area.name.split(',')[0].toLowerCase()));
  return match?.estimatedMinutes;
};

export const toDeliveryAddress = (a: SavedAddress): DeliveryAddress => ({
  id: a.id,
  label: a.label,
  recipientName: a.recipientName,
  phoneNumber: a.phoneNumber,
  fullAddress: [a.houseNo, a.buildingName, a.areaAddress, a.city, a.pincode].filter(Boolean).join(', '),
  landmark: a.landmark,
  city: a.city,
  pincode: a.pincode,
  latitude: a.latitude,
  longitude: a.longitude,
  deliveryInstructions: a.deliveryInstructions,
  serviceable: isServiceablePincode(a.pincode),
  etaMinutes: etaMinutesFor(a.areaAddress),
});

export const novAddressToDelivery = (a: Address, phoneNumber = '', recipientName = ''): DeliveryAddress => ({
  id: a.id,
  label: a.label,
  recipientName,
  phoneNumber,
  fullAddress: [a.street, a.area, a.city, a.pincode].filter(Boolean).join(', '),
  landmark: a.landmark,
  city: a.city,
  pincode: a.pincode,
  deliveryInstructions: a.deliveryInstructions,
  serviceable: a.serviceable,
  etaMinutes: etaMinutesFor(a.area) ?? (a.serviceable && a.deliveryMinutes > 0 ? a.deliveryMinutes : undefined),
});

// Maps a saved address onto the NOV Address shape so the header and AppContext stay in sync.
export const toNovAddress = (a: SavedAddress): Address => ({
  id: a.id,
  label: a.label,
  street: [a.houseNo, a.buildingName].filter(Boolean).join(', '),
  landmark: a.landmark,
  area: a.areaAddress,
  city: a.city,
  pincode: a.pincode,
  serviceable: isServiceablePincode(a.pincode),
  deliveryMinutes: etaMinutesFor(a.areaAddress) ?? 12,
  isDefault: a.isDefault,
  deliveryInstructions: a.deliveryInstructions,
});

interface AddressState {
  addresses: SavedAddress[];
  selectedId: string | null;
  saveAddress: (address: SavedAddress) => void;
  removeAddress: (id: string) => void;
  selectAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedId: null,

      saveAddress: (address) => {
        const others = get().addresses.filter((a) => a.id !== address.id);
        const normalized = address.isDefault ? others.map((a) => ({ ...a, isDefault: false })) : others;
        set({ addresses: [address, ...normalized], selectedId: address.id });
      },

      removeAddress: (id) => {
        const addresses = get().addresses.filter((a) => a.id !== id);
        const selectedId = get().selectedId === id ? addresses[0]?.id ?? null : get().selectedId;
        set({ addresses, selectedId });
      },

      selectAddress: (id) => set({ selectedId: id }),
    }),
    {
      name: 'glowvai_commerce_addresses_v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
