import { collection, getDocs, query, where } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../config/firebase';
import { setLiveCatalog, type SkincareProduct } from '../data/indianSkincareCatalog';
import { defaultVariant, readProductVariants } from '../../../lib/shop/variants';
import { readSubscribable } from '../../../lib/shop/subscribable';
import { useCartStore } from '../state/cartStore';

// Splits a comma or line separated list into trimmed items.
function splitList(value: string): string[] {
  return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
}

export interface ProductRating {
  average: number;
  count: number;
}

// Turns a product saved by the admin console into the shape the shop screens use. Rating and review count come from the
// reviews totals (null when the product has no approved reviews). The delivery time is shown only when the product
// carries one (null otherwise). Nothing here is made up: a missing value stays null and the screens show nothing for it.
export function toShopProduct(id: string, d: Record<string, unknown>, rating?: ProductRating | null): SkincareProduct {
  // A product with variants shows its default variant as the headline price; the variant list is what the page offers.
  const stored = readProductVariants(d.variants);
  const options = stored.ok && stored.variants ? stored.variants : null;
  const base = options ? defaultVariant(options) : null;
  const price = base ? base.price : Number(d.brandPrice) || 0;
  const discount = base ? (base.mrp > base.price ? Math.round(((base.mrp - base.price) / base.mrp) * 100) : 0) : Math.min(100, Math.max(0, Number(d.brandDiscount) || 0));
  const pictures = Array.isArray(d.pictures) ? (d.pictures as string[]) : [];
  const photo = pictures[0] || null;
  const ingredients = typeof d.ingredients === 'string' ? d.ingredients : '';
  const minutes = Number(d.deliveryMinutes);
  const hasRating = !!rating && rating.count > 0 && rating.average > 0;
  return {
    id,
    brand: String(d.brandName ?? ''),
    name: String(d.productName ?? ''),
    category: d.category as SkincareProduct['category'],
    price,
    originalPrice: base ? base.mrp : discount > 0 ? Math.round(price / (1 - discount / 100)) : price,
    discountPercent: discount,
    volume: String(d.volume ?? ''),
    matchScore: 0,
    rating: hasRating ? rating.average : null,
    reviewCount: hasRating ? rating.count : null,
    imageSource: photo ? { uri: photo } : null,
    official_brand_image_url: photo ?? undefined,
    cardBg: '#f4f6fb',
    description: String(d.productDescription ?? ''),
    keyActives: splitList(typeof d.keyActives === 'string' && d.keyActives ? d.keyActives : ingredients),
    metrics: { hydration: '', glow: '', barrier: '' },
    deliveryMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
    ...(options ? { variants: options } : {}),
    subscribable: readSubscribable(d.subscribable),
  };
}

// The state of the product list for the shop chrome: an error (with a retry) when the last load failed. The list itself
// is never cleared on a failed load, so a customer never sees an empty catalogue because of a read error.
export const useProductFeedStatus = create<{ error: boolean; retry: () => void }>(() => ({ error: false, retry: () => undefined }));

// Loads the published products once per device and keeps them for an hour. A live listener re-read all products on
// every visit and reconnect, which used up the free database quota. Product changes appear within the hour.
const CACHE_KEY = 'glowvai_products_v2';
const CACHE_MS = 60 * 60 * 1000;

interface CacheEntry {
  at: number;
  rows: SkincareProduct[];
}

function readCache(): CacheEntry | null {
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null') as CacheEntry | null;
    return cached && Array.isArray(cached.rows) && cached.rows.length > 0 ? cached : null;
  } catch {
    return null;
  }
}

// Ratings for the products that have reviews. A failure here only means no ratings are shown; the list still loads.
async function fetchRatings(): Promise<Record<string, ProductRating>> {
  try {
    const res = await fetch('/api/shop/ratings', { headers: { Accept: 'application/json' } });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; ratings?: Record<string, ProductRating> } | null;
    return res.ok && body?.ok && body.ratings ? body.ratings : {};
  } catch {
    return {};
  }
}

export function startProductFeed(): () => void {
  let cancelled = false;
  let lastGood: SkincareProduct[] | null = null;

  const apply = (rows: SkincareProduct[]) => {
    if (cancelled) return;
    setLiveCatalog(rows);
    // Old cart lines move to the default variant, and lines already in the bag pick up current variant prices.
    if (rows.length > 0) useCartStore.getState().reconcileWithCatalog(rows);
  };

  // A cache older than the hour is kept as a fallback for a failed read, but is not shown while a fresh load runs.
  const cached = readCache();
  const cacheFresh = !!cached && Date.now() - cached.at < CACHE_MS;
  if (cached && cacheFresh) {
    lastGood = cached.rows;
    apply(cached.rows);
  }

  const load = async () => {
    try {
      const [snap, ratings] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('status', '==', 'PUBLISHED'))),
        fetchRatings(),
      ]);
      // Firestore answers from its local cache (an empty list when nothing is cached) when the server cannot be reached.
      // That is not a real answer: it is treated as a failed read, so the last good list stays on screen.
      if (snap.metadata.fromCache) throw new Error('products read from cache only');
      const rows = snap.docs.map((doc) => toShopProduct(doc.id, doc.data(), ratings[doc.id] ?? null));
      lastGood = rows;
      apply(rows);
      useProductFeedStatus.setState({ error: false });
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows } satisfies CacheEntry));
      } catch {
        // Storage full or blocked: nothing to cache.
      }
    } catch {
      // A failed read keeps the last good list (this session's, or the cached one, even if it is older than an hour).
      // Only when there is none does the catalogue stay as it is, and the error below tells the customer.
      const keep = lastGood ?? cached?.rows ?? null;
      if (keep && keep.length > 0) apply(keep);
      if (!cancelled) useProductFeedStatus.setState({ error: true });
    }
  };

  useProductFeedStatus.setState({ retry: () => void load() });
  void load();
  return () => {
    cancelled = true;
  };
}
