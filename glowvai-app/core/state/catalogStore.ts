import { useEffect } from 'react';
import { create } from 'zustand';
import { INDIAN_SKINCARE_CATALOG } from '../data/indianSkincareCatalog';
import type { SkincareProduct } from '../data/indianSkincareCatalog';
import { getCatalogSource, loadVendorProducts } from '../services/storefrontCatalog';
import type { CatalogSource } from '../services/storefrontCatalog';

// The shop's product list: the built-in catalogue first, then published vendor products once they load.
// Screens read it through useCatalog() (which re-renders them when vendor products arrive) instead of importing
// INDIAN_SKINCARE_CATALOG, so search, filters, categories, brands and concerns all include vendor products.

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface CatalogState {
  products: SkincareProduct[];
  vendorProducts: SkincareProduct[];
  source: CatalogSource | null;
  status: CatalogStatus;
  load: () => Promise<void>;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: INDIAN_SKINCARE_CATALOG,
  vendorProducts: [],
  source: null,
  status: 'idle',

  // Runs once. A slow, blocked or failing source leaves the built-in catalogue in place; it never blocks the page.
  load: async () => {
    if (get().status !== 'idle') return;
    const source = getCatalogSource();
    if (source === 'none') {
      set({ source, status: 'ready' });
      return;
    }
    set({ source, status: 'loading' });
    try {
      const vendorProducts = await loadVendorProducts(source);
      const builtInIds = new Set(INDIAN_SKINCARE_CATALOG.map((p) => p.id));
      const extra = vendorProducts.filter((p) => !builtInIds.has(p.id));
      if (process.env.NODE_ENV !== 'production') console.info(`[Catalog] ${extra.length} vendor products from ${source}`);
      set({
        vendorProducts: extra,
        products: extra.length ? [...INDIAN_SKINCARE_CATALOG, ...extra] : INDIAN_SKINCARE_CATALOG,
        status: 'ready',
      });
    } catch (err) {
      console.warn(`[Catalog] Vendor products not loaded from ${source}:`, (err as Error)?.message ?? err);
      set({ status: 'failed' });
    }
  },
}));

/** The current product list, for code outside React render (event handlers, helpers). */
export const getCatalog = (): SkincareProduct[] => useCatalogStore.getState().products;

export const findCatalogProduct = (id: string | undefined): SkincareProduct | undefined =>
  id ? getCatalog().find((p) => p.id === id) : undefined;

/** Subscribes a component to the product list and starts loading vendor products on first use. */
export function useCatalog(): SkincareProduct[] {
  const products = useCatalogStore((s) => s.products);
  useEffect(() => {
    void useCatalogStore.getState().load();
  }, []);
  return products;
}

/** True while vendor products are still loading, so a product page opened by link can wait instead of saying "not found". */
export const useCatalogLoading = (): boolean => useCatalogStore((s) => s.status === 'idle' || s.status === 'loading');
