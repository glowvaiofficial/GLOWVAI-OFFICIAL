import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Address } from '../../../types';
import { VIJAYAWADA_AREAS } from '../../../data/serviceability';
import type { SavedAddressView } from '../../../core/services/shopApi';

// Saved delivery addresses are the server's list (users/{uid}/addresses, at most five, one default). This store keeps a
// copy for instant display and remembers which one the customer picked on this device.
export type SavedAddress = SavedAddressView;

// What checkout, express and order placement read from, whichever source the address came from.
export interface DeliveryAddress {
  id: string;
  // The server id of a saved address. Only saved addresses are re-checked by the order route through this id.
  savedId?: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  fullAddress: string;
  landmark?: string;
  city: string;
  pincode: string;
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
  savedId: a.id,
  label: a.label,
  recipientName: a.recipientName,
  phoneNumber: a.phone,
  fullAddress: [a.fullAddress, a.city, a.pincode].filter(Boolean).join(', '),
  landmark: a.landmark || undefined,
  city: a.city,
  pincode: a.pincode,
  serviceable: isServiceablePincode(a.pincode),
  etaMinutes: etaMinutesFor(a.fullAddress),
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
  street: a.fullAddress,
  landmark: a.landmark || undefined,
  area: a.fullAddress,
  city: a.city,
  pincode: a.pincode,
  serviceable: isServiceablePincode(a.pincode),
  deliveryMinutes: etaMinutesFor(a.fullAddress) ?? 12,
  isDefault: a.isDefault,
});

interface AddressState {
  addresses: SavedAddress[];
  selectedId: string | null;
  // True once the server list has been read on this device (false while only the cached copy is shown).
  loaded: boolean;
  // Replaces the list with the server's. The selection moves to the default when the chosen address is gone.
  setAddresses: (addresses: SavedAddress[]) => void;
  selectAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedId: null,
      loaded: false,

      setAddresses: (addresses) => {
        const current = get().selectedId;
        const keep = addresses.some((a) => a.id === current);
        const fallback = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
        set({ addresses, selectedId: keep ? current : fallback, loaded: true });
      },

      selectAddress: (id) => set({ selectedId: id }),
    }),
    {
      name: 'glowvai_saved_addresses_v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ addresses: state.addresses, selectedId: state.selectedId }),
    }
  )
);
