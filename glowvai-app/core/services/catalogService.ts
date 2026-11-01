/**
 * Dynamic Product Catalog Service for GlowVAI V2
 * 
 * Fetches products in real-time from Firebase Firestore `products` collection,
 * with automatic fallback to curated catalog data and offline caching.
 */

import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { INDIAN_SKINCARE_CATALOG, SkincareProduct, FALLBACK_PRODUCT_IMAGE } from '../data/indianSkincareCatalog';

export interface CatalogFetchResult {
  products: SkincareProduct[];
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
}

const PRODUCTS_COLLECTION = 'products';

/**
 * Fetches dynamic catalog from Cloud Firestore
 */
export const fetchLiveProductCatalog = async (
  categoryFilter: string = 'all'
): Promise<SkincareProduct[]> => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = categoryFilter !== 'all'
      ? query(productsRef, where('category', '==', categoryFilter))
      : query(productsRef);

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: SkincareProduct[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as SkincareProduct;
        items.push({
          ...data,
          id: docSnap.id,
          imageSource: data.imageSource || (data.official_brand_image_url ? { uri: data.official_brand_image_url } : FALLBACK_PRODUCT_IMAGE),
        });
      });
      return items;
    }

    // If Firestore collection is empty, seed with initial catalog
    await seedInitialProductsToFirestore();
    return INDIAN_SKINCARE_CATALOG;
  } catch (err: any) {
    console.warn('[CatalogService] Firestore fetch error, using local fallback:', err?.message);
    return categoryFilter === 'all'
      ? INDIAN_SKINCARE_CATALOG
      : INDIAN_SKINCARE_CATALOG.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
  }
};

/**
 * Seeds initial curated skincare products into Firestore
 */
export const seedInitialProductsToFirestore = async (): Promise<void> => {
  try {
    for (const prod of INDIAN_SKINCARE_CATALOG) {
      const prodRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      await setDoc(prodRef, {
        ...prod,
        imageSource: null, // Avoid storing local requires in Firestore
        updatedAt: Date.now(),
      }, { merge: true });
    }
    console.log('[CatalogService] Seeded initial products to Firestore.');
  } catch (seedErr: any) {
    console.warn('[CatalogService] Seeding note:', seedErr?.message);
  }
};
