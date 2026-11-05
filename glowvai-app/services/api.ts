/**
 * Glowvai Centralized API Contracts & Client Service
 * Implements authoritative backend contract rules defined in PRD Section 27
 */

import { Address, CartItem, Product, SkinReport } from '../types';
import { PRODUCTS } from '../data/products';
import { VIJAYAWADA_AREAS } from '../data/serviceability';
import { deliveryFeeFor } from '../shared/pricing-rules.mjs';

// Simulated delay helper for realistic network response
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sign-in, orders and support tickets are not simulated here. They go to the shop's server routes
// (core/services/shopApi.ts).
export const ApiService = {
  // ── 2. SERVICEABILITY REVALIDATION (PRD Section 9 & 27.4)
  async checkServiceability(address: Address): Promise<{
    serviceable: boolean;
    quickCommerce: boolean;
    etaMinutes: number;
    deliveryFee: number;
    message?: string;
  }> {
    await delay(300);
    const areaMatch = VIJAYAWADA_AREAS.find(
      (a) => a.pincode === address.pincode || address.area.toLowerCase().includes(a.name.toLowerCase())
    );

    if (!areaMatch) {
      return {
        serviceable: true,
        quickCommerce: false,
        etaMinutes: 1440, // standard delivery
        deliveryFee: 49,
        message: 'Quick commerce is only live in Vijayawada. Standard delivery (2-3 days) will be used.',
      };
    }

    return {
      serviceable: true,
      quickCommerce: areaMatch.quickCommerceAvailable,
      etaMinutes: areaMatch.estimatedMinutes,
      deliveryFee: areaMatch.deliveryFee,
    };
  },

  // ── 3. CATALOGUE & SEARCH (PRD Section 11, 12, 13 & 27.5)
  async getProducts(category?: string, preference?: string): Promise<Product[]> {
    await delay(200);
    let list = [...PRODUCTS];
    if (category && category !== 'All Products' && category !== 'All Skin Care' && category !== 'All Cosmetics') {
      list = list.filter((p) => p.category === category || p.subcategory === category);
    }
    if (preference && preference !== 'all') {
      list = list.filter((p) => p.genderTarget === preference || p.genderTarget === 'all');
    }
    return list;
  },

  async searchProducts(query: string): Promise<Product[]> {
    await delay(250);
    const q = query.toLowerCase().trim();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchBrand = p.brand.toLowerCase().includes(q);
      const matchSub = p.subcategory.toLowerCase().includes(q);
      const matchIngr = p.ingredients.some((i) => i.toLowerCase().includes(q));
      return matchName || matchBrand || matchSub || matchIngr;
    });
  },

  // ── 4. AUTHORITATIVE CART PRICING (PRD Section 14, 15 & 27.6)
  validateCartPricing(items: CartItem[], address: Address): {
    itemSubtotal: number;
    discountTotal: number;
    insuranceTotal: number;
    deliveryFee: number;
    finalPayable: number;
    isSplitDelivery: boolean;
    sourcingNotice?: string;
  } {
    let subtotal = 0;
    let discount = 0;
    let insuranceTotal = 0;
    let hasRemoteItem = false;

    items.forEach((item) => {
      const variant = item.product.variants.find((v) => v.id === item.variantId) || item.product.variants[0];
      const itemPrice = variant.price * item.quantity;
      const itemMrp = variant.mrp * item.quantity;

      subtotal += itemMrp;
      discount += itemMrp - itemPrice;

      if (item.withInsurance && item.product.insuranceEligible) {
        insuranceTotal += (item.product.insuranceFee || 29) * item.quantity;
      }

      if (!item.product.isSourcedNearby) {
        hasRemoteItem = true;
      }
    });

    // Subtotal after discounts. The payments server applies the same rule from shared/pricing-rules.mjs.
    const discountedTotal = subtotal - discount;
    const deliveryFee = deliveryFeeFor({ itemTotal: discountedTotal, area: address.area });
    const finalPayable = discountedTotal + deliveryFee + insuranceTotal;

    return {
      itemSubtotal: subtotal,
      discountTotal: discount,
      insuranceTotal,
      deliveryFee,
      finalPayable: Math.max(0, finalPayable),
      isSplitDelivery: hasRemoteItem && items.length > 1,
      sourcingNotice: hasRemoteItem
        ? 'One or more items are being dispatched from our regional fulfilment hub in Auto Nagar to complete your order.'
        : undefined,
    };
  },

  // ── 6. ML FACIAL ANALYSIS (PRD Section 7, 8 & 27.10)
  async analyzeFaceImage(
    imageDataUrl: string,
    retainImage: boolean
  ): Promise<{ success: boolean; report: SkinReport }> {
    await delay(4500); // Realistic diagnostic processing time (5-10s per PRD 7.8)

    // Placeholder output until the computer vision service is connected. The UI labels it as a sample.
    const report: SkinReport = {
      id: `rep-${Date.now()}`,
      timestamp: 'Today, Just now',
      isSample: true,
      skinScore: 82, // placeholder on a 0-100 scale
      skinType: 'Combination',
      skinTone: 'Medium',
      observations: [
        {
          name: 'Pore Congestion & Sebum',
          severity: 'moderate',
          score: 68,
          notes: 'Excess sebum activity detected around T-Zone (forehead & nasal bridge).',
        },
        {
          name: 'Active Redness & Sensitivity',
          severity: 'low',
          score: 22,
          notes: 'Mild localized capillary redness near cheek apex. Barrier intact.',
        },
        {
          name: 'Hyperpigmentation & Dark Spots',
          severity: 'moderate',
          score: 45,
          notes: 'Surface post-inflammatory marks visible on lower right cheek.',
        },
        {
          name: 'Hydration & Texture Smoothness',
          severity: 'low',
          score: 84,
          notes: 'High epidermis moisture retention with fine micro-relief texture.',
        },
      ],
      recommendedIngredients: [
        'Niacinamide (2-5%) to balance T-Zone sebum and fade dark spots',
        'Salicylic Acid (BHA 1-2%) for gentle non-abrasive pore clearing',
        'Ceramides & Panthenol to reinforce epidermis barrier',
      ],
      ingredientsToAvoid: [
        'High-alcohol astringent toners (may trigger rebound oiliness)',
        'Physical walnut/apricot scrubs (risk micro-tearing active redness)',
      ],
      recommendedProductIds: [
        'prod-min-salicylic-2',
        'prod-derma-niacinamide-10',
        'prod-min-spf50',
      ],
      retainedImage: retainImage,
    };

    return {
      success: true,
      report,
    };
  },

};
