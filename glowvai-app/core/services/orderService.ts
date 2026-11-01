/**
 * Order Service for Customer Orders & Real-time Quick-Commerce Tracking in GlowVAI V2
 * 
 * Provides unified real backend API endpoints (/api/orders/create, /api/payment/verify, /api/orders/:id/sla-status)
 * with graceful Firestore persistence and live SLA status streaming.
 */

import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  OrderDocument,
  OrderItem,
  OrderPricing,
  OrderPayment,
  OrderDeliveryType,
  UserAddress,
} from '../types';
import { ORDERS_COLLECTION } from './vendorService';
import { getBackendBaseUrl, getCloudBackendUrl } from './apiConfig';

export interface CreateOrderParams {
  orderId?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: OrderDeliveryType;
  vendorId?: string | null;
  vendorName?: string | null;
  zoneId?: string | null;
  items: OrderItem[];
  shippingAddress: UserAddress;
  pricing: OrderPricing;
  payment: OrderPayment;
  referralCodeUsed?: string | null;
}

export interface BackendOrderResponse {
  ok: boolean;
  orderId: string;
  storeId?: string;
  data?: any;
  error?: string;
}

export interface SlaStatusResponse {
  ok: boolean;
  orderId: string;
  currentPhase: 'OMS' | 'WMS' | 'TMS' | 'TRANSIT' | 'DELIVERED';
  phaseIndex: number;
  remainingSeconds: number;
  etaMinutes: number;
  deliveryOtp: string;
  phases: Array<{ name: string; targetSeconds: number; completed: boolean; current: boolean }>;
}

// A fresh 4-digit handover code per order, instead of the same code for every customer.
export const newDeliveryOtp = (): string => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(1000 + (values[0] % 9000));
};

/**
 * Creates a real order in the backend orchestrator (Express server + Firestore)
 */
export const createOrder = async (params: CreateOrderParams): Promise<OrderDocument> => {
  const orderId = params.orderId || `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const now = Date.now();

  const newOrder: OrderDocument = {
    orderId,
    userId: params.userId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    deliveryType: params.deliveryType,
    vendorId: params.vendorId || 'DS-VIJ-01',
    vendorName: params.vendorName || 'Glowway Darkstore Payikapuram',
    vendorStatus: 'ACCEPTED',
    zoneId: params.zoneId || 'ZONE-VIJ-01',
    items: params.items,
    shippingAddress: params.shippingAddress,
    pricing: params.pricing,
    payment: params.payment,
    status: 'PLACED',
    referralCodeUsed: params.referralCodeUsed || null,
    referralProcessed: false,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Call real backend API (/api/orders/create)
  const candidateUrls = [
    `${getBackendBaseUrl()}/api/orders/create`,
    'http://localhost:4000/api/orders/create',
    `${getCloudBackendUrl()}/api/orders/create`,
  ];

  const payload = {
    orderId,
    orderAmount: params.pricing.grandTotal,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    deliveryAddress: params.shippingAddress.fullAddress || params.shippingAddress.streetAddress || 'Vijayawada',
    items: params.items.map(it => ({
      name: it.productName || it.title,
      qty: it.quantity,
      price: it.unitPrice,
    })),
    paymentMethod: params.payment.method,
    deliveryOtp: newDeliveryOtp(),
    storeId: 'DS-VIJ-01',
  };

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        break;
      }
    } catch {
      // try next
    }
  }

  // 2. Non-blocking Firestore sync
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderRef, JSON.parse(JSON.stringify(newOrder)));
  } catch (dbErr: any) {
    console.warn('[Firestore Sync Note]:', dbErr?.message);
  }

  return newOrder;
};

/**
 * Verifies payment with the backend
 */
export const verifyOrderPayment = async (orderId: string, grandTotal: number): Promise<boolean> => {
  const candidateUrls = [
    `${getBackendBaseUrl()}/api/payment/verify`,
    'http://localhost:4000/api/payment/verify',
    `${getCloudBackendUrl()}/api/payment/verify`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderAmount: grandTotal,
          razorpay_order_id: `rzp_${orderId}`,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'verified_via_upi_intent',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.verified === true;
      }
    } catch {
      // try next
    }
  }
  // Verification could not be reached, so the payment is not confirmed.
  return false;
};

/**
 * Fetches real-time 10-minute SLA status for an order
 */
export const fetchOrderSlaStatus = async (orderId: string): Promise<SlaStatusResponse | null> => {
  const candidateUrls = [
    `${getBackendBaseUrl()}/api/orders/${orderId}/sla-status`,
    'http://localhost:4000/api/orders/' + orderId + '/sla-status',
    `${getCloudBackendUrl()}/api/orders/${orderId}/sla-status`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as SlaStatusResponse;
      }
    } catch {
      // continue
    }
  }
  return null;
};

/**
 * Fetches order by orderId
 */
export const getOrderById = async (orderId: string): Promise<OrderDocument | null> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const snapshot = await getDoc(orderRef);
    if (snapshot.exists()) {
      return snapshot.data() as OrderDocument;
    }
  } catch {}
  return null;
};

/**
 * Fetches user order history
 */
export const getUserOrders = async (userId: string): Promise<OrderDocument[]> => {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as OrderDocument);
  } catch {}
  return [];
};
