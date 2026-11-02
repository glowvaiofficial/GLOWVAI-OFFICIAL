import { resolveImageSource } from '../../../core/assets/productImages';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';

export const formatRupee = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Cart items store a plain URL string, so flatten the { uri } source.
export const getProductImageUrl = (product: SkincareProduct): string => {
  const source = resolveImageSource(product.imageSource ?? product.official_brand_image_url);
  return typeof source === 'object' && source !== null && typeof source.uri === 'string' ? source.uri : '';
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
// The cart line a catalogue product adds, the same shape the shop screens use.
export const cartLineFor = (product: SkincareProduct) => ({
  productId: product.id,
  name: product.name,
  brand: product.brand,
  image: getProductImageUrl(product),
  price: product.price,
  mrp: product.originalPrice,
});
