import { createOrder, newDeliveryOtp } from '../../../core/services/orderService';
import { triggerWhatsAppDispatchAlert } from '../../../core/utils/whatsapp';
import type { CartItem } from '../../../core/state/cartStore';
import type { OrderDeliveryType, OrderItem, OrderPricing, PaymentStatus, UserAddress } from '../../../core/types';
import type { CartTotals } from './pricing';
import type { DeliveryAddress } from './addressStore';
import { payChoiceMeta, type PayChoice } from './checkoutSession';
import type { Order } from '../../../types';

// One handover code per order, shared by the order record and the dispatch alert so the rider and the
// customer see the same code.
const orderOtps = new Map<string, string>();
const deliveryOtpFor = (orderId: string): string => {
  let otp = orderOtps.get(orderId);
  if (!otp) {
    otp = newDeliveryOtp();
    orderOtps.set(orderId, otp);
  }
  return otp;
};

export interface PlaceOrderInput {
  orderId: string;
  items: CartItem[];
  totals: CartTotals;
  pay: PayChoice;
  paid: boolean;
  deliveryType: OrderDeliveryType;
  address: DeliveryAddress;
  customer: { userId: string; name: string; phone: string };
  tipAmount?: number;
  pricing?: Partial<OrderPricing>;
}

const toOrderItems = (items: CartItem[]): OrderItem[] =>
  items.map((item) => ({
    productId: item.productId,
    sku: item.productId,
    title: item.name,
    productName: item.name,
    brand: item.brand,
    unitPrice: item.price,
    quantity: item.quantity,
    totalPrice: item.price * item.quantity,
    imageUrl: item.image,
    hasBeautyProtection: false,
    beautyProtectionFee: 0,
  }));

const toShippingAddress = (address: DeliveryAddress): UserAddress => ({
  addressId: address.id,
  label: address.label as UserAddress['label'],
  recipientName: address.recipientName,
  phoneNumber: address.phoneNumber,
  streetAddress: address.fullAddress,
  landmark: address.landmark,
  city: address.city,
  pincode: address.pincode,
  postalCode: address.pincode,
  country: 'India',
  fullAddress: address.fullAddress,
  deliveryInstructions: address.deliveryInstructions,
  latitude: address.latitude,
  longitude: address.longitude,
  isDefault: false,
  isQuickCommerceServiceable: address.serviceable,
});

// Writes the order through the shared orderService, the same call the mobile checkout used.
export const placeCartOrder = async (input: PlaceOrderInput) => {
  const { totals, items, pay, paid, address, customer } = input;
  const meta = payChoiceMeta(pay);
  const status: PaymentStatus = paid ? 'PAID' : 'PENDING';

  return createOrder({
    orderId: input.orderId,
    userId: customer.userId,
    customerName: customer.name,
    customerPhone: customer.phone,
    deliveryType: input.deliveryType,
    items: toOrderItems(items),
    shippingAddress: toShippingAddress(address),
    pricing: {
      subtotal: totals.discountedTotal,
      deliveryFee: totals.deliveryFee,
      discountAmount: totals.catalogSavings + totals.couponDiscount,
      coinsRedeemed: 0,
      beautyProtectionTotal: 0,
      itemTotal: totals.itemTotal,
      discountTotal: totals.catalogSavings + totals.couponDiscount,
      handlingFee: 0,
      tax: 0,
      tipAmount: input.tipAmount ?? 0,
      grandTotal: totals.grandTotal + (input.tipAmount ?? 0),
      ...input.pricing,
    },
    payment: {
      method: meta.method,
      status,
      transactionId: `TXN_${Date.now()}`,
      paidAt: paid ? Date.now() : undefined,
    },
    referralCodeUsed: null,
    deliveryOtp: deliveryOtpFor(input.orderId),
  });
};

// Fire-and-forget WhatsApp dispatch alert used by the express flow.
export const sendDispatchAlert = (input: PlaceOrderInput) => {
  const meta = payChoiceMeta(input.pay);
  triggerWhatsAppDispatchAlert({
    orderId: input.orderId,
    customerName: input.customer.name,
    customerPhone: input.customer.phone,
    deliveryAddress: input.address.fullAddress,
    darkStoreName: 'Glowway Darkstore Payikapuram (DS-VIJ-01)',
    items: input.items.map((item) => ({ name: item.name, qty: item.quantity, price: item.price })),
    totalAmount: input.totals.grandTotal + (input.tipAmount ?? 0),
    paymentMethod: meta.group === 'cod' ? 'CASH ON DELIVERY' : `ONLINE (${meta.method})`,
    deliveryOtp: deliveryOtpFor(input.orderId),
  }).catch(() => null);
};

// The orders list and tracking read the app's local order history, so a placed order is also recorded there.
export const toLocalOrder = (input: PlaceOrderInput, paidOnline: boolean, etaMinutes: number | null): Order => {
  const meta = payChoiceMeta(input.pay);
  const tip = input.tipAmount ?? 0;
  const label = (['Home', 'Work', 'Other'] as const).find((l) => l === input.address.label) ?? 'Other';
  return {
    id: input.orderId,
    createdAt: new Date().toISOString(),
    items: input.items.map((item) => ({
      productId: item.productId,
      productName: item.name,
      brand: item.brand,
      variantSize: '',
      quantity: item.quantity,
      unitPrice: item.price,
      insuranceSelected: false,
      insuranceFee: 0,
      imageUrl: item.image,
    })),
    address: {
      id: input.address.id,
      label,
      street: input.address.fullAddress,
      landmark: input.address.landmark,
      area: input.address.city,
      city: input.address.city,
      pincode: input.address.pincode,
      serviceable: input.address.serviceable,
      deliveryMinutes: etaMinutes ?? 0,
      isDefault: false,
      deliveryInstructions: input.address.deliveryInstructions,
    },
    itemSubtotal: input.totals.itemTotal,
    discount: input.totals.catalogSavings + input.totals.couponDiscount,
    deliveryFee: input.totals.deliveryFee,
    insuranceTotal: 0,
    finalPayable: input.totals.grandTotal + tip,
    paymentMethod: meta.group === 'cod' ? 'cod' : meta.group === 'card' ? 'card' : 'upi',
    paymentStatus: meta.group === 'cod' ? 'pending' : paidOnline ? 'successful' : 'failed',
    status: 'order_placed',
    estimatedDeliveryMinutes: etaMinutes ?? 0,
    isSplitDelivery: false,
    fulfilmentTasks: [],
  };
};
