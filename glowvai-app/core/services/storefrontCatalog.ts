/**
 * Marketplace products for the shop.
 *
 * Vendors list products in the vendor app, an admin approves them, and the vendor backend publishes them to the
 * Firestore collection `products` (publicly readable, admin-only writes). This file reads those storefront documents
 * and maps them to the shop's SkincareProduct shape. It never writes to Firestore.
 *
 * Where vendor products come from is set by NEXT_PUBLIC_CATALOG_SOURCE:
 *   - 'none' (default): built-in catalogue only.
 *   - 'firestore': read `products` where active == true with the Firebase web SDK.
 *   - 'vendor-api': GET {NEXT_PUBLIC_VENDOR_API_URL}/api/storefront/products (local development and testing).
 */

import type { SkincareProduct } from '../data/indianSkincareCatalog';

export type CatalogSource = 'none' | 'firestore' | 'vendor-api';

const CATEGORIES: readonly SkincareProduct['category'][] = ['Serums', 'Moisturizers', 'Suncare', 'Cleansers', 'Treatments'];

/** The delivery time the built-in catalogue gives its regular products. */
export const DEFAULT_DELIVERY_MINUTES = 12;

/** Vendor products get this prefix in the shop so their ids can never collide with built-in ids such as prod-01. */
export const VENDOR_PRODUCT_PREFIX = 'v-';
export const toShopProductId = (storefrontId: string) => `${VENDOR_PRODUCT_PREFIX}${storefrontId}`;
/** The `products/{id}` document id behind a shop product id, for orders sent to the backend. */
export const toStorefrontId = (shopProductId: string) =>
  shopProductId.startsWith(VENDOR_PRODUCT_PREFIX) ? shopProductId.slice(VENDOR_PRODUCT_PREFIX.length) : shopProductId;

/** products/{id} as written by the vendor backend. */
export interface StorefrontProduct {
  id: string;
  vendorId: string;
  storeId?: string;
  /** Optional display names. Without one the product page does not say who sells it. */
  storeName?: string;
  vendorName?: string;
  brand: string;
  name: string;
  category: SkincareProduct['category'];
  price: number;
  originalPrice?: number;
  volume?: string;
  description?: string;
  keyActives?: string[];
  images?: string[];
  inStock: boolean;
  availableStock?: number;
  active: boolean;
  approvedAt?: unknown;
  updatedAt?: unknown;
}

const VALID_SOURCES: readonly CatalogSource[] = ['none', 'firestore', 'vendor-api'];

export const vendorApiUrl = (): string => (process.env.NEXT_PUBLIC_VENDOR_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

/**
 * The configured source. Outside production a developer (or a browser test) can override it with
 * localStorage gv_catalog_source, so the dev server does not need restarting to try another source.
 */
export const getCatalogSource = (): CatalogSource => {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem('gv_catalog_source');
      if (override && (VALID_SOURCES as readonly string[]).includes(override)) return override as CatalogSource;
    } catch {
      /* Storage blocked: use the configured source. */
    }
  }
  const configured = process.env.NEXT_PUBLIC_CATALOG_SOURCE;
  return configured && (VALID_SOURCES as readonly string[]).includes(configured) ? (configured as CatalogSource) : 'none';
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// Storefront images are https URLs (Firebase Storage). A dev vendor API may serve its own uploads over http; the
// /shop CSP allows that origin only when NEXT_PUBLIC_VENDOR_API_URL is set, so only then are they accepted.
const isUsableImage = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    const configured = process.env.NEXT_PUBLIC_VENDOR_API_URL;
    return parsed.protocol === 'http:' && Boolean(configured) && parsed.origin === new URL(configured as string).origin;
  } catch {
    return false;
  }
};

/**
 * Maps one storefront document to a shop product, or null when it should not be sold: not active, out of stock,
 * not from a vendor, or missing the fields the shop needs. Nothing is invented: no rating, review count, match
 * score or skin metrics (the shop UI does not show those).
 */
export const mapStorefrontProduct = (raw: unknown): SkincareProduct | null => {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Partial<Record<keyof StorefrontProduct, unknown>>;
  const id = text(doc.id);
  const vendorId = text(doc.vendorId);
  const name = text(doc.name);
  const brand = text(doc.brand);
  const category = CATEGORIES.find((c) => c === doc.category);
  const price = typeof doc.price === 'number' && Number.isFinite(doc.price) ? doc.price : NaN;
  if (!id || !vendorId || !name || !brand || !category || !(price > 0)) return null;
  if (doc.active !== true || doc.inStock !== true) return null;
  if (typeof doc.availableStock === 'number' && doc.availableStock <= 0) return null;

  const originalPrice =
    typeof doc.originalPrice === 'number' && Number.isFinite(doc.originalPrice) && doc.originalPrice >= price ? doc.originalPrice : price;
  const images = Array.isArray(doc.images) ? doc.images.map(text).filter(isUsableImage) : [];
  const keyActives = Array.isArray(doc.keyActives) ? doc.keyActives.map(text).filter(Boolean) : [];
  const storeName = text(doc.storeName) || text(doc.vendorName);

  return {
    id: toShopProductId(id),
    brand,
    name,
    category,
    price,
    originalPrice,
    volume: text(doc.volume),
    matchScore: 0,
    rating: 0,
    reviewCount: 0,
    imageSource: images[0] ? { uri: images[0] } : null,
    official_brand_image_url: images[0],
    cardBg: '#F8FAFC',
    description: text(doc.description),
    keyActives,
    metrics: { hydration: '', glow: '', barrier: '' },
    deliveryMinutes: DEFAULT_DELIVERY_MINUTES,
    vendorId,
    storeId: text(doc.storeId) || undefined,
    storeName: storeName || undefined,
  };
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

const LOAD_TIMEOUT_MS = 8000;

const fetchFromVendorApi = async (): Promise<unknown[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${vendorApiUrl()}/api/storefront/products`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`vendor API answered ${res.status}`);
    const body: unknown = await res.json();
    if (Array.isArray(body)) return body;
    const wrapped = body as { products?: unknown; data?: unknown; items?: unknown } | null;
    const list = wrapped?.products ?? wrapped?.data ?? wrapped?.items;
    return Array.isArray(list) ? list : [];
  } finally {
    clearTimeout(timer);
  }
};

// Firebase is loaded only when this source is used, so the default build does not pull Firestore in for the catalogue.
const fetchFromFirestore = async (): Promise<unknown[]> => {
  const [{ collection, getDocs, query, where }, { db }] = await Promise.all([import('firebase/firestore'), import('../config/firebase')]);
  const snapshot = await withTimeout(getDocs(query(collection(db, 'products'), where('active', '==', true))), LOAD_TIMEOUT_MS, 'Firestore products read');
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
};

/** Loads published vendor products from the given source. Resolves to [] for 'none'; rejects on failure or timeout. */
export const loadVendorProducts = async (source: CatalogSource): Promise<SkincareProduct[]> => {
  if (source === 'none') return [];
  const docs = source === 'firestore' ? await fetchFromFirestore() : await fetchFromVendorApi();
  const seen = new Set<string>();
  const products: SkincareProduct[] = [];
  for (const doc of docs) {
    const product = mapStorefrontProduct(doc);
    if (product && !seen.has(product.id)) {
      seen.add(product.id);
      products.push(product);
    }
  }
  return products;
};
