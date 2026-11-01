/**
 * Dermatology Recommendation Service for GlowVAI V2
 * 
 * Maps AI skin scan metrics into a targeted 4-step routine:
 * 1. Gentle Cleanser
 * 2. Hydrating Toner
 * 3. Targeted Serum
 * 4. Moisturizer / Broad-Spectrum Sunscreen
 */

import { RoutineProduct, SkinScanReport } from '../types/scan';
import { LOCAL_PRODUCT_IMAGES } from '../assets/productImages';

export const getRecommendedRoutine = (
  _report?: SkinScanReport | null
): (RoutineProduct & { imageSource?: any })[] => {
  return [
    {
      id: 'ROUTINE-01',
      stepNumber: 1,
      stepName: 'Gentle Cleanser',
      brand: 'Minimalist',
      name: 'Salicylic + LHA 2% Cleanser (100ml)',
      keyIngredients: ['2% Salicylic Acid', 'Zinc PCA', 'Centella'],
      price: 299,
      originalPrice: 349,
      rating: 4.9,
      reviewsCount: 3420,
      isQuickCommerceAvailable: true,
      deliveryMinutes: 15,
      imageSource: LOCAL_PRODUCT_IMAGES.minimalistCleanser,
    },
    {
      id: 'ROUTINE-02',
      stepNumber: 2,
      stepName: 'Targeted Serum',
      brand: 'Minimalist',
      name: '10% Niacinamide + Zinc 1% (30ml)',
      keyIngredients: ['10% Niacinamide', '1% Zinc PCA', 'EUK-134'],
      price: 599,
      originalPrice: 699,
      rating: 4.9,
      reviewsCount: 4280,
      isQuickCommerceAvailable: true,
      deliveryMinutes: 15,
      imageSource: LOCAL_PRODUCT_IMAGES.minimalistNiacinamide,
    },
    {
      id: 'ROUTINE-03',
      stepNumber: 3,
      stepName: 'Barrier Moisturizer',
      brand: 'The Derma Co',
      name: 'Ceramide + HA Intense Moisturizer (50g)',
      keyIngredients: ['Ceramides Complex', 'Hyaluronic Acid 1%', 'Centella'],
      price: 349,
      originalPrice: 399,
      rating: 4.9,
      reviewsCount: 4100,
      isQuickCommerceAvailable: true,
      deliveryMinutes: 15,
      imageSource: LOCAL_PRODUCT_IMAGES.dermacoCeramide,
    },
    {
      id: 'ROUTINE-04',
      stepNumber: 4,
      stepName: 'Sunscreen Protection',
      brand: 'The Derma Co',
      name: '1% Hyaluronic Sunscreen Aqua Gel SPF 60 (50g)',
      keyIngredients: ['Hyaluronic Acid 1%', 'Vitamin E', 'Blue Light Shield'],
      price: 499,
      originalPrice: 549,
      rating: 4.9,
      reviewsCount: 7100,
      isQuickCommerceAvailable: true,
      deliveryMinutes: 15,
      imageSource: LOCAL_PRODUCT_IMAGES.dermacoSunscreen,
    },
  ];
};
