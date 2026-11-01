/**
 * Glowvai Centralized API Contracts & Client Service
 * Implements authoritative backend contract rules defined in PRD Section 27
 */

import {
  Address,
  CartItem,
  Order,
  PaymentMethodType,
  PaymentVerification,
  Product,
  SkinReport,
  BeautyInsuranceStreak,
  SupportTicket,
  UserProfile,
} from '../types';
import { PRODUCTS } from '../data/products';
import { VIJAYAWADA_AREAS } from '../data/serviceability';
import { deliveryFeeFor } from '../shared/pricing-rules.mjs';

// Simulated delay helper for realistic network response
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Demo OTP for the prototype backend. Real verification happens server-side once the auth service is connected.
export const DEMO_OTP = '123456';

// Orders already created for an idempotency key, so a retried checkout never creates a second order.
const ordersByIdempotencyKey = new Map<string, Order>();

export const ApiService = {
  // ── 1. AUTHENTICATION (PRD Section 6 & 27.1)
  async requestOtp(phoneNumber: string): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    await delay(600);
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    // Rate limit check simulation
    return {
      success: true,
      message: `OTP sent successfully to +91 ${cleaned}`,
      cooldownSeconds: 30,
    };
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; user: UserProfile; token: string }> {
    await delay(800);
    if (otp !== DEMO_OTP) {
      throw new Error('Invalid OTP. Please check the code or request a new one.');
    }
    const user: UserProfile = {
      id: `usr-${Date.now()}`,
      phoneNumber: `+91 ${phoneNumber}`,
      shoppingPreference: 'all',
      onboardingCompleted: true,
      facialAnalysisCompleted: false,
      consentGiven: false,
    };
    return {
      success: true,
      user,
      token: `glowvai_jwt_${Date.now()}`,
    };
  },

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

  // ── 5. CHECKOUT & ORDER CREATION (PRD Section 15, 16 & 27.7)
  async createOrder(
    idempotencyKey: string,
    items: CartItem[],
    address: Address,
    paymentMethod: PaymentMethodType,
    checkoutDiscount = 0,
    verification?: PaymentVerification
  ): Promise<Order> {
    if (paymentMethod !== 'cod' && !verification) {
      throw new Error('Online payment must be verified before the order is created.');
    }
    const existing = ordersByIdempotencyKey.get(idempotencyKey);
    if (existing) return existing;
    await delay(1200); // Simulate network & payment verification

    const pricing = this.validateCartPricing(items, address);

    const orderId = `GLOW-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: items.map((i) => {
        const v = i.product.variants.find((v) => v.id === i.variantId) || i.product.variants[0];
        return {
          productId: i.product.id,
          productName: i.product.name,
          brand: i.product.brand,
          variantSize: v.size,
          quantity: i.quantity,
          unitPrice: v.price,
          insuranceSelected: i.withInsurance,
          insuranceFee: i.withInsurance ? i.product.insuranceFee || 29 : 0,
          imageUrl: i.product.images[0],
        };
      }),
      address,
      itemSubtotal: pricing.itemSubtotal,
      discount: pricing.discountTotal + checkoutDiscount,
      deliveryFee: pricing.deliveryFee,
      insuranceTotal: pricing.insuranceTotal,
      finalPayable: Math.max(0, pricing.finalPayable - checkoutDiscount),
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'successful',
      paymentProvider: verification?.provider,
      paymentReference: verification?.paymentId,
      status: 'confirmed',
      estimatedDeliveryMinutes: pricing.isSplitDelivery ? 45 : address.deliveryMinutes || 15,
      isSplitDelivery: pricing.isSplitDelivery,
      splitDeliveryNote: pricing.sourcingNotice,
      // No rider is assigned until the fulfilment service reports one, so no rider name is shown.
      fulfilmentTasks: [
        {
          taskId: `task-fulfil-${orderId}-1`,
          sourceType: 'dark_store',
          status: 'assigned',
          etaMinutes: address.deliveryMinutes || 15,
        },
      ],
    };

    ordersByIdempotencyKey.set(idempotencyKey, newOrder);
    return newOrder;
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

  // ── 7. BEAUTY INSURANCE & STREAKS (PRD Section 20 & 27.11)
  createStreakFromOrder(order: Order): BeautyInsuranceStreak[] {
    const insuredItems = order.items.filter((item) => item.insuranceSelected);
    return insuredItems.map((item, idx) => ({
      trackingId: `strk-${order.id}-${idx}`,
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.imageUrl,
      policyVersion: 'Glowvai-Suitability-v1.2',
      startDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      endDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      totalDaysRequired: 14,
      completedDays: 1,
      missedDays: 0,
      status: 'active',
      days: Array.from({ length: 14 }, (_, i) => ({
        day: i + 1,
        date: new Date(Date.now() + i * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        completed: i === 0,
        missed: false,
        evidenceType: i === 0 ? 'photo' : undefined,
        timestamp: i === 0 ? 'Day 1 Check-in completed' : undefined,
      })),
    }));
  },

  // ── 8. SUPPORT TICKETS (PRD Section 24 & 27.13)
  async submitSupportTicket(
    category: SupportTicket['category'],
    subject: string,
    initialMessage: string,
    orderId?: string
  ): Promise<SupportTicket> {
    await delay(700);
    const newTicket: SupportTicket = {
      id: `TCK-${Date.now().toString().slice(-5)}`,
      createdAt: 'Just now',
      orderId,
      category,
      subject,
      status: 'Open',
      messages: [
        {
          sender: 'user',
          text: initialMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          sender: 'agent',
          text: `Thank you for contacting Glowvai Support regarding ${category}. Our Vijayawada care team has received your ticket and is reviewing the details.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    return newTicket;
  },
};
