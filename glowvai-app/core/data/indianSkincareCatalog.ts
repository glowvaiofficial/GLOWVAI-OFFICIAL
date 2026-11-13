import { useSyncExternalStore } from 'react';

import { LOCAL_PRODUCT_IMAGES } from '../assets/productImages';
import type { Variant } from '../../../lib/shop/variants';

export interface SkincareProduct {
  id: string;
  brand: string;
  name: string;
  category: 'Serums' | 'Moisturizers' | 'Suncare' | 'Cleansers' | 'Treatments';
  price: number;
  originalPrice: number;
  discountPercent?: number;
  volume: string;
  matchScore: number;
  // null until the product has approved reviews (from the reviews totals). Never a made-up number.
  rating: number | null;
  reviewCount: number | null;
  imageSource: any;
  official_brand_image_url?: string;
  cardBg: string;
  description: string;
  keyActives: string[];
  metrics: {
    hydration: string;
    glow: string;
    barrier: string;
  };
  // null when the product carries no delivery time. The screens show nothing for it.
  deliveryMinutes: number | null;
  // True only when the admin has marked the product subscribable. Subscribe is offered only for these.
  subscribable?: boolean;
  // Sizes, shades or packs with their own price and stock. Empty or missing: the product is sold as one item.
  variants?: Variant[];
}

// Live product list, filled from the database (collection "products", status PUBLISHED). Starts empty.
let liveProducts: SkincareProduct[] = [];
// False until the first real answer (a loaded list, or a list from the cache). Lets screens tell "still loading" from "none listed".
let liveReady = false;
const listeners = new Set<() => void>();

export function setLiveCatalog(items: SkincareProduct[]): void {
  liveProducts = items;
  liveReady = true;
  listeners.forEach((notify) => notify());
}

export function getCatalogReady(): boolean {
  return liveReady;
}

export function useCatalogReady(): boolean {
  return useSyncExternalStore(subscribeLiveCatalog, getCatalogReady, getCatalogReady);
}

export function subscribeLiveCatalog(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function getLiveCatalog(): SkincareProduct[] {
  return liveProducts;
}

// Screens call this so they re-render when products arrive.
export function useLiveCatalog(): SkincareProduct[] {
  return useSyncExternalStore(subscribeLiveCatalog, getLiveCatalog, getLiveCatalog);
}

