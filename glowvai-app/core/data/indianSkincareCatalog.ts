import { useSyncExternalStore } from 'react';

import { LOCAL_PRODUCT_IMAGES } from '../assets/productImages';

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
  rating: number;
  reviewCount: number;
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
  deliveryMinutes: number;
}

// Brands come from the live product list (see useLiveCatalog); nothing is hard-coded here.
export const ALL_SKINCARE_BRANDS: string[] = [];


export const FALLBACK_PRODUCT_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80',
};

// Live product list, filled from the database (collection "products", status PUBLISHED). Starts empty.
let liveProducts: SkincareProduct[] = [];
const listeners = new Set<() => void>();

export function setLiveCatalog(items: SkincareProduct[]): void {
  liveProducts = items;
  listeners.forEach((notify) => notify());
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

