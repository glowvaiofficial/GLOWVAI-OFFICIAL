import { resolveImageSource } from '../../../core/assets/productImages';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';

export const formatRupee = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Cart items store a plain URL string, so flatten the { uri } source.
export const getProductImageUrl = (product: SkincareProduct): string => {
  const source = resolveImageSource(product.imageSource ?? product.official_brand_image_url);
  return typeof source === 'object' && source !== null && typeof source.uri === 'string' ? source.uri : '';
};

export const getDiscountPercent = (product: SkincareProduct): number => {
  if (product.discountPercent) return product.discountPercent;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
};
