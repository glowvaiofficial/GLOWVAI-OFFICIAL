import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { setLiveCatalog, type SkincareProduct } from '../data/indianSkincareCatalog';

// Splits a comma or line separated list into trimmed items.
function splitList(value: string): string[] {
  return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
}

// Turns a product saved by the admin console into the shape the shop screens use. Fields the admin does not capture
// yet (ratings, delivery time, actives) are left empty, so the shop shows nothing for them rather than made-up values.
export function toShopProduct(id: string, d: Record<string, unknown>): SkincareProduct {
  const price = Number(d.brandPrice) || 0;
  const discount = Math.min(100, Math.max(0, Number(d.brandDiscount) || 0));
  const pictures = Array.isArray(d.pictures) ? (d.pictures as string[]) : [];
  const photo = pictures[0] || null;
  const ingredients = typeof d.ingredients === 'string' ? d.ingredients : '';
  return {
    id,
    brand: String(d.brandName ?? ''),
    name: String(d.productName ?? ''),
    category: d.category as SkincareProduct['category'],
    price,
    originalPrice: discount > 0 ? Math.round(price / (1 - discount / 100)) : price,
    discountPercent: discount,
    volume: String(d.volume ?? ''),
    matchScore: 0,
    rating: 0,
    reviewCount: 0,
    imageSource: photo ? { uri: photo } : null,
    official_brand_image_url: photo ?? undefined,
    cardBg: '#f4f6fb',
    description: String(d.productDescription ?? ''),
    keyActives: splitList(typeof d.keyActives === 'string' && d.keyActives ? d.keyActives : ingredients),
    metrics: { hydration: '', glow: '', barrier: '' },
    deliveryMinutes: 0,
  };
}

// Loads the published products once per device and keeps them for an hour. A live listener re-read all products on
// every visit and reconnect, which used up the free database quota. Product changes appear within the hour.
const CACHE_KEY = 'glowvai_products_v1';
const CACHE_MS = 60 * 60 * 1000;

export function startProductFeed(): () => void {
  let cancelled = false;
  const apply = (rows: SkincareProduct[]) => {
    if (!cancelled) setLiveCatalog(rows);
  };
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; rows: SkincareProduct[] } | null;
    if (cached && Date.now() - cached.at < CACHE_MS && cached.rows.length > 0) apply(cached.rows);
  } catch {
    // Storage blocked: fetch every time.
  }
  void getDocs(query(collection(db, 'products'), where('status', '==', 'PUBLISHED')))
    .then((snap) => {
      const rows = snap.docs.map((doc) => toShopProduct(doc.id, doc.data()));
      apply(rows);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }));
      } catch {
        // Storage full or blocked: nothing to cache.
      }
    })
    .catch(() => apply([]));
  return () => {
    cancelled = true;
  };
}
