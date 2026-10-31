/**
 * Product & Catalog Interfaces for GlowVAI V2
 */

export interface ProductDocument {
  productId: string;
  sku: string;
  title: string;
  brand: string;
  description: string;
  categoryIds: string[];
  ingredients: string[];
  targetedConcerns: string[];
  suitableSkinTypes: string[];
  howToUse: string;
  images: string[];
  mrp: number; // in INR
  discountedPrice: number;
  isBeautyProtectionEligible: boolean;
  beautyProtectionFee?: number;
  isQuickCommerceEligible: boolean;
  panIndiaAvailable: boolean;
  totalStock: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
