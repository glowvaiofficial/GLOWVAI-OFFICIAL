import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getProductBySlug } from "@/lib/catalog";

export interface CartItem {
  id: string; // product id or slug + size
  slug: string;
  name: string;
  size: string;
  price: number;
  mrp: number;
  image: string;
  quantity: number;
  available: boolean;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  checkoutEnabled: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity" | "available"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  revalidatePrices: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotalSavings: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      checkoutEnabled: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (newItem) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.id === newItem.id);

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex].quantity += newItem.quantity || 1;
          set({ items: updated, isOpen: true });
        } else {
          set({
            items: [
              ...currentItems,
              {
                ...newItem,
                quantity: newItem.quantity || 1,
                available: true,
              },
            ],
            isOpen: true,
          });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, delta) => {
        const updated = get()
          .items.map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter((i): i is CartItem => i !== null);

        set({ items: updated });
      },

      clearCart: () => set({ items: [] }),

      revalidatePrices: () => {
        const updated = get().items.map((item) => {
          const catalogProd = getProductBySlug(item.slug);
          if (!catalogProd) {
            return { ...item, available: false };
          }
          // A product sold in sizes (50ml, 100ml) carries its own price for each size. Use it, not the base price.
          const sizePrice = catalogProd.sizes?.find((s) => s.size === item.size);
          return {
            ...item,
            price: sizePrice ? sizePrice.price : catalogProd.price,
            mrp: sizePrice ? sizePrice.mrp : catalogProd.mrp,
            available: true,
          };
        });
        set({ items: updated });
      },

      getTotalItems: () => {
        return get().items.reduce((acc, curr) => (curr.available ? acc + curr.quantity : acc), 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (acc, curr) => (curr.available ? acc + curr.price * curr.quantity : acc),
          0
        );
      },

      getTotalSavings: () => {
        return get().items.reduce((acc, curr) => {
          if (!curr.available || !curr.mrp || curr.mrp <= curr.price) return acc;
          return acc + (curr.mrp - curr.price) * curr.quantity;
        }, 0);
      },
    }),
    {
      name: "gv_cart_store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
