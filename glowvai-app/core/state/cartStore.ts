import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { lineKeyOf, migrateCartLines, type Variant } from '../../../lib/shop/variants';

// A cart line is one product in one variant. Items are keyed by lineKeyOf(productId, variantId): the product id alone
// for a product without variants, "productId::variantId" otherwise. Prices here are for display; the server re-prices.
export interface CartItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  name: string;
  brand: string;
  image: string;
  price: number;
  mrp?: number;
  quantity: number;
}

interface CartState {
  items: Record<string, CartItem>;
  totalCount: number;
  totalPrice: number;
  mrpTotal: number;
  savings: number;

  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  // The key arguments are line keys (see lineKeyOf); for a product without variants the key is the product id.
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  // Brings saved lines up to date with the published catalogue (default variant for old lines, current variant prices).
  reconcileWithCatalog: (products: { id: string; variants?: Variant[] }[]) => void;
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
        const key = lineKeyOf(item.productId, item.variantId);
        const existing = items[key];
        items[key] = {
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

      reconcileWithCatalog: (products) => {
        const catalog = new Map(products.map((p) => [p.id, p.variants ?? null]));
        const items = migrateCartLines(get().items, catalog);
        set({ items, ...recompute(items) });
      },
    }),
    {
      name: 'glowvai_cart_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Lines saved before variants existed keep their key and price until the catalogue is loaded.
          state.items = migrateCartLines(state.items);
          Object.assign(state, recompute(state.items));
        }
      },
    }
  )
);
