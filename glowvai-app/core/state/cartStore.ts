import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  mrp?: number;
  /** Set for marketplace products: the vendor that sells this line. Undefined for built-in products. */
  vendorId?: string;
  quantity: number;
}

interface CartState {
  items: Record<string, CartItem>;
  totalCount: number;
  totalPrice: number;
  mrpTotal: number;
  savings: number;

  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

function recompute(items: Record<string, CartItem>) {
  const values = Object.values(items);
  const totalCount = values.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = values.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const mrpTotal = values.reduce((sum, i) => sum + i.quantity * (i.mrp ?? i.price), 0);
  const savings = Math.max(0, mrpTotal - totalPrice);
  return { totalCount, totalPrice, mrpTotal, savings };
}

// Persisted to on-device storage so the cart survives app restarts.
// TODO: once the backend has a real cart endpoint, also sync writes to
// Firestore users/{uid}/cart/{itemId} here so cart state follows the user
// across devices, not just this one.
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      totalCount: 0,
      totalPrice: 0,
      mrpTotal: 0,
      savings: 0,

      addItem: (item) => {
        const items = { ...get().items };
        const existing = items[item.productId];
        items[item.productId] = {
          ...item,
          quantity: (existing?.quantity ?? 0) + 1,
        };
        set({ items, ...recompute(items) });
      },

      incrementItem: (productId) => {
        const items = { ...get().items };
        const target = items[productId];
        if (!target) return;
        items[productId] = { ...target, quantity: target.quantity + 1 };
        set({ items, ...recompute(items) });
      },

      decrementItem: (productId) => {
        const items = { ...get().items };
        const target = items[productId];
        if (!target) return;
        if (target.quantity <= 1) {
          delete items[productId];
        } else {
          items[productId] = { ...target, quantity: target.quantity - 1 };
        }
        set({ items, ...recompute(items) });
      },

      removeItem: (productId) => {
        const items = { ...get().items };
        delete items[productId];
        set({ items, ...recompute(items) });
      },

      clearCart: () => set({ items: {}, totalCount: 0, totalPrice: 0, mrpTotal: 0, savings: 0 }),
    }),
    {
      name: 'glowvai_cart_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          Object.assign(state, recompute(state.items));
        }
      },
    }
  )
);
