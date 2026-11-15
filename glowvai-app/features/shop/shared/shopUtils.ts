import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { defaultVariant } from '../../../../lib/shop/variants';

export const formatRupee = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Real photos of the exact catalogue item. The old catalogue images were a handful of stock photos, several
// showing other brands' products, so every other product gets the brand fallback tile.
const PRODUCT_PHOTOS: Record<string, string> = {
  'prod-03': '/glowvai/assets/products/web/minimalist-salicylic-2.webp',
  'prod-07': '/glowvai/assets/products/web/minimalist-vitamin-b5.webp',
};

// Every product without a photo shows this one brand-blue tile with the GlowVai mark (no per-product placeholder art).
export const PRODUCT_FALLBACK_URL = '/brand/product-fallback.svg';

// Cart items store a plain URL string, so this always returns one.
// A product's own photo first; otherwise the built-in photo for that id, otherwise the generated brand tile.
export const getProductImageUrl = (product: SkincareProduct): string => {
  const own = typeof product.imageSource?.uri === 'string' ? product.imageSource.uri : product.official_brand_image_url;
  return own || PRODUCT_PHOTOS[product.id] || PRODUCT_FALLBACK_URL;
};

// True when the product has a real photo (its own, or a built-in one), not the brand fallback tile.
export const hasProductPhoto = (product: SkincareProduct): boolean => getProductImageUrl(product) !== PRODUCT_FALLBACK_URL;

// The thumbnail of the first product in the list that has a real photo, or null (the caller then draws the brand tile).
export const firstPhotoUrl = (products: SkincareProduct[], width = 400): string | null => {
  const found = products.find(hasProductPhoto);
  return found ? getProductThumbUrl(found, width) : null;
};

// Smaller image for cards and tiles: Unsplash URLs are asked for a 400px-wide rendition. Local images are returned as they are.
export const getProductThumbUrl = (product: SkincareProduct, width = 400): string => {
  const url = getProductImageUrl(product);
  if (!url.includes('images.unsplash.com')) return url;
  return /([?&])w=\d+/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${width}`) : `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
};

// The ₹1 trial sample is a test product, not a full-size item, so ranking rails leave it out.
export const isTrialProduct = (product: SkincareProduct): boolean => /\b(trial|sample)\b/i.test(product.name);

export const getDiscountPercent = (product: SkincareProduct): number => {
  if (product.discountPercent) return product.discountPercent;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
};
// The cart line a catalogue product adds, the same shape the shop screens use. A product with variants adds its
// default variant; screens that let the customer choose send them to the product page instead.
export const cartLineFor = (product: SkincareProduct) => {
  const variant = product.variants?.length ? defaultVariant(product.variants) : null;
  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    variantLabel: variant?.label ?? null,
    name: product.name,
    brand: product.brand,
    image: getProductImageUrl(product),
    price: variant?.price ?? product.price,
    mrp: variant?.mrp ?? product.originalPrice,
  };
};

// Products with sizes, shades or packs are chosen on the product page, not added from a card or a rail.
export const hasVariantOptions = (product: SkincareProduct): boolean => (product.variants?.length ?? 0) > 0;

export type SearchSort = 'relevance' | 'price-asc' | 'price-desc' | 'rating';

export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Top rated',
};

// Returns a new list; "relevance" keeps the catalogue order. Products without a rating sort last for "Top rated".
export const sortProducts = <T extends { price: number; rating?: number | null }>(products: readonly T[], sort: SearchSort): T[] => {
  const list = [...products];
  if (sort === 'price-asc') return list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return list.sort((a, b) => b.price - a.price);
  if (sort === 'rating') return list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  return list;
};

// The white GlowVai mark, drawn on brand-blue tiles.
export const BRAND_MARK_URL = '/brand/glowvai-mark-white.png';
