/**
 * Order Domain Types for GlowVAI V2
 */

import { UserAddress } from './user';
import { DeliveryAssignment } from './delivery';

export type OrderDeliveryType = 'QUICK_COMMERCE' | 'STANDARD_ECOMMERCE' | 'EXPRESS_15_MIN';

export type OrderStatus =
  | 'PLACED'
  | 'VENDOR_PENDING'
  | 'VENDOR_ACCEPTED'
  | 'VENDOR_REJECTED'
  | 'PACKED'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type VendorOrderStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PACKED';

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET' | 'PHONEPE' | 'GPAY' | 'PAYTM' | 'BHIM';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COMPLETED';

export interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  productName?: string;
  brand?: string;
  unitPrice: number;
  quantity: number;
  totalPrice?: number;
  imageUrl: string;
  hasBeautyProtection: boolean;
  beautyProtectionFee: number;
}

export interface OrderPricing {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  coinsRedeemed: number;
  beautyProtectionTotal: number;
  grandTotal: number;
  itemTotal?: number;
  discountTotal?: number;
  handlingFee?: number;
  tax?: number;
  tipAmount?: number;
}

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: number;
}

export interface OrderDocument {
  orderId: string;
  userId: string;
  customerPhone: string;
  customerName: string;
  deliveryType: OrderDeliveryType;
  
  // Vendor specific assignment & workflow
  vendorId?: string | null;
  vendorName?: string | null;
  vendorStatus?: VendorOrderStatus;
  vendorRejectionReason?: string | null;
  vendorAcceptedAt?: number | null;
  vendorPackedAt?: number | null;
  
  // Delivery assignment
  zoneId?: string | null;
  deliveryAssignment?: DeliveryAssignment | null;
  
  items: OrderItem[];
  shippingAddress: UserAddress;
  pricing: OrderPricing;
  payment: OrderPayment;
  status: OrderStatus;
  
  referralCodeUsed?: string | null;
  referralProcessed: boolean;
  
  createdAt: number;
  updatedAt: number;
}
