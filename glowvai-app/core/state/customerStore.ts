import { create } from 'zustand';
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
    if (res.ok) set({ profile: res.data?.profile ?? null, profileStatus: 'ready' });
    else set({ profileStatus: 'error' });
  },

  saveProfile: async (input) => {
    const res = await saveProfileRequest(input);
    if (!res.ok) return { ok: false, error: res.error };
    set({
      profile: {
        name: input.name.trim(),
        phone: input.phone.replace(/\D/g, '').slice(-10),
        email: (input.email ?? '').trim().toLowerCase(),
        address: input.address,
        marketingOptIn: input.marketingOptIn === true,
      },
      profileStatus: 'ready',
    });
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
