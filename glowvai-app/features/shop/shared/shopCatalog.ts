import { useEffect, useRef } from 'react';
import { Activity, Droplet, Droplets, Leaf, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { getDiscountPercent } from './shopUtils';

// Everything here is derived from the local catalogue, so counts, prices and discounts are real.

export type CategoryId = SkincareProduct['category'];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  short: string;
  Icon: LucideIcon;
}

export const SHOP_CATEGORIES: CategoryMeta[] = [
  { id: 'Serums', label: 'Serums & Actives', short: 'Serums', Icon: Sparkles },
  { id: 'Suncare', label: 'Sunscreen & SPF', short: 'Sunscreen', Icon: Sun },
  { id: 'Moisturizers', label: 'Moisturisers & Creams', short: 'Moisturisers', Icon: Leaf },
  { id: 'Cleansers', label: 'Cleansers & Face Wash', short: 'Cleansers', Icon: Droplet },
  { id: 'Treatments', label: 'Treatments & Trials', short: 'Treatments', Icon: Activity },
];

export const getCategoryMeta = (id: string | undefined): CategoryMeta | undefined =>
  SHOP_CATEGORIES.find((c) => c.id === id);

export const productsInCategory = (id: string): SkincareProduct[] =>
  INDIAN_SKINCARE_CATALOG.filter((p) => p.category === id);

export const categoryCount = (id: string): number => productsInCategory(id).length;

/** Lowest catalogue price in a category, or null when the category is empty. */
export const categoryFromPrice = (id: string): number | null => {
  const prices = productsInCategory(id).map((p) => p.price);
  return prices.length ? Math.min(...prices) : null;
};

/** The trial sample sits in the catalogue at ₹1; keep it out of "regular" shelves so rails stay comparable. */
export const isTrialProduct = (p: SkincareProduct) => p.price <= 1;
export const TRIAL_PRODUCT = INDIAN_SKINCARE_CATALOG.find(isTrialProduct);
export const REGULAR_PRODUCTS = INDIAN_SKINCARE_CATALOG.filter((p) => !isTrialProduct(p));

/** Concerns are matched with keywords against the product name, description and key actives. */
export interface ConcernMeta {
  id: string;
  label: string;
  Icon: LucideIcon;
  keywords: string[];
}

export const SHOP_CONCERNS: ConcernMeta[] = [
  { id: 'acne', label: 'Acne & Blemishes', Icon: ShieldCheck, keywords: ['acne', 'blemish', 'salicylic', 'tea tree', 'breakout'] },
  { id: 'hydration', label: 'Hydration & Dryness', Icon: Droplets, keywords: ['hydrat', 'moistur', 'dry', 'hyaluronic', 'glycerin'] },
  { id: 'brightening', label: 'Dark Spots & Glow', Icon: Sun, keywords: ['bright', 'dark spot', 'vitamin c', 'glow', 'pigment', 'kojic'] },
  { id: 'antiaging', label: 'Fine Lines', Icon: Sparkles, keywords: ['anti-aging', 'anti aging', 'firm', 'wrinkle', 'retinol', 'peptide', 'collagen'] },
  { id: 'barrier', label: 'Barrier Repair', Icon: Leaf, keywords: ['barrier', 'repair', 'ceramide', 'sooth', 'sensitive', 'calm'] },
];

export const matchesConcern = (product: SkincareProduct, concernId: string): boolean => {
  const concern = SHOP_CONCERNS.find((c) => c.id === concernId);
  if (!concern) return true;
  const haystack = `${product.name} ${product.description} ${product.keyActives.join(' ')}`.toLowerCase();
  return concern.keywords.some((kw) => haystack.includes(kw));
};

export const concernCount = (concernId: string): number =>
  REGULAR_PRODUCTS.filter((p) => matchesConcern(p, concernId)).length;

export interface BrandSummary {
  brand: string;
  count: number;
  fromPrice: number;
  bestDiscount: number;
  image: SkincareProduct;
}

/** Brands that actually have products in the catalogue, most products first. */
export const SHOP_BRANDS: BrandSummary[] = (() => {
  const map = new Map<string, SkincareProduct[]>();
  for (const p of REGULAR_PRODUCTS) map.set(p.brand, [...(map.get(p.brand) ?? []), p]);
  return [...map.entries()]
    .map(([brand, items]) => ({
      brand,
      count: items.length,
      fromPrice: Math.min(...items.map((p) => p.price)),
      bestDiscount: Math.max(...items.map(getDiscountPercent)),
      image: items[0],
    }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
})();

export const brandKey = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Products sorted by their real catalogue discount, biggest first. */
export const BIGGEST_DISCOUNTS = [...REGULAR_PRODUCTS].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));

/** Scroll the app's scroll container back to the top whenever `key` changes (screens opened from a scrolled list). */
export function useScrollTopOn(key: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On phones the app scrolls inside .screen-content; on the website the page itself scrolls.
    ref.current?.closest('.screen-content')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [key]);
  return ref;
}
