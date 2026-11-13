import { create } from 'zustand';
import { isLanguageCode } from '@/lib/shop/settings/rules';
import { useLanguageStore } from '../i18n/store';
import {
  cancelOrder as cancelOrderRequest,
  fetchOrders,
  fetchProfile,
  saveProfile as saveProfileRequest,
  type ShopOrder,
  type ShopProfile,
  type ShopProfileInput,
} from '../services/shopApi';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

// The customer's saved profile and orders as the server has them (users/{uid} and orders where userId == uid).
// Nothing here is invented on the device: until the server answers, screens show a loading or error state.
interface CustomerState {
  profile: ShopProfile | null;
  profileStatus: LoadStatus;
  orders: ShopOrder[];
  ordersStatus: LoadStatus;
  ordersError: string | null;
  loadProfile: () => Promise<void>;
  saveProfile: (input: ShopProfileInput) => Promise<ActionResult>;
  loadOrders: () => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<ActionResult>;
  reset: () => void;
}

export const useCustomerStore = create<CustomerState>()((set, get) => ({
  profile: null,
  profileStatus: 'idle',
  orders: [],
  ordersStatus: 'idle',
  ordersError: null,

  loadProfile: async () => {
    set({ profileStatus: 'loading' });
    const res = await fetchProfile();
    if (res.ok) {
      const profile = res.data?.profile ?? null;
      set({ profile, profileStatus: 'ready' });
      // The account language wins over the device choice once the account is loaded.
      if (profile?.language && isLanguageCode(profile.language)) useLanguageStore.getState().setLanguage(profile.language);
    } else set({ profileStatus: 'error' });
  },

  saveProfile: async (input) => {
    const res = await saveProfileRequest(input);
    if (!res.ok) return { ok: false, error: res.error };
    // Show the saved values at once, then take the server's copy (with the consent dates) so nothing drifts.
    const previous = get().profile;
    set({
      profile: {
        ...(previous ?? { address: null, language: undefined }),
        name: input.name.trim(),
        phone: input.phone.replace(/\D/g, '').slice(-10),
        phoneVerified: previous?.phoneVerified ?? false,
        email: (input.email ?? '').trim().toLowerCase(),
        address: input.address === undefined || input.address === null ? previous?.address ?? null : input.address,
        marketingOptIn: input.marketingOptIn ?? previous?.marketingOptIn ?? false,
        analyticsOptIn: input.analyticsOptIn ?? previous?.analyticsOptIn ?? false,
      },
      profileStatus: 'ready',
    });
    await get().loadProfile();
    return { ok: true, error: null };
  },

  loadOrders: async () => {
    set({ ordersStatus: get().orders.length ? 'ready' : 'loading', ordersError: null });
    const res = await fetchOrders();
    if (res.ok) set({ orders: res.data?.orders ?? [], ordersStatus: 'ready', ordersError: null });
    else set({ ordersStatus: 'error', ordersError: res.error });
  },

  cancelOrder: async (orderId, reason) => {
    const res = await cancelOrderRequest(orderId, reason);
    if (!res.ok) return { ok: false, error: res.error };
    await get().loadOrders();
    return { ok: true, error: null };
  },

  reset: () => set({ profile: null, profileStatus: 'idle', orders: [], ordersStatus: 'idle', ordersError: null }),
}));
