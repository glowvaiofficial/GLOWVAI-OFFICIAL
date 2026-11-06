import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { setLiveCatalog, type SkincareProduct } from '../data/indianSkincareCatalog';
import { defaultVariant, readProductVariants } from '../../../lib/shop/variants';
import { useCartStore } from '../state/cartStore';

// Splits a comma or line separated list into trimmed items.
function splitList(value: string): string[] {
  return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
}

// Turns a product saved by the admin console into the shape the shop screens use. Fields the admin does not capture
// yet (ratings, delivery time, actives) are left empty, so the shop shows nothing for them rather than made-up values.
export function toShopProduct(id: string, d: Record<string, unknown>): SkincareProduct {
  // A product with variants shows its default variant as the headline price; the variant list is what the page offers.
  const stored = readProductVariants(d.variants);
  const options = stored.ok && stored.variants ? stored.variants : null;
  const base = options ? defaultVariant(options) : null;
  const price = base ? base.price : Number(d.brandPrice) || 0;
  const discount = base ? (base.mrp > base.price ? Math.round(((base.mrp - base.price) / base.mrp) * 100) : 0) : Math.min(100, Math.max(0, Number(d.brandDiscount) || 0));
  const pictures = Array.isArray(d.pictures) ? (d.pictures as string[]) : [];
  const photo = pictures[0] || null;
  const ingredients = typeof d.ingredients === 'string' ? d.ingredients : '';
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
    rating: 0,
    reviewCount: 0,
    imageSource: photo ? { uri: photo } : null,
    official_brand_image_url: photo ?? undefined,
    cardBg: '#f4f6fb',
    description: String(d.productDescription ?? ''),
    keyActives: splitList(typeof d.keyActives === 'string' && d.keyActives ? d.keyActives : ingredients),
    metrics: { hydration: '', glow: '', barrier: '' },
    deliveryMinutes: 0,
    ...(options ? { variants: options } : {}),
  };
}

// Loads the published products once per device and keeps them for an hour. A live listener re-read all products on
// every visit and reconnect, which used up the free database quota. Product changes appear within the hour.
const CACHE_KEY = 'glowvai_products_v2';
const CACHE_MS = 60 * 60 * 1000;

export function startProductFeed(): () => void {
  let cancelled = false;
  const apply = (rows: SkincareProduct[]) => {
    if (cancelled) return;
    setLiveCatalog(rows);
    // Old cart lines move to the default variant, and lines already in the bag pick up current variant prices.
    if (rows.length > 0) useCartStore.getState().reconcileWithCatalog(rows);
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
