import { createOrder, newDeliveryOtp } from '../../../core/services/orderService';
import { triggerWhatsAppDispatchAlert } from '../../../core/utils/whatsapp';
import type { CartItem } from '../../../core/state/cartStore';
import type { OrderDeliveryType, OrderItem, OrderPricing, PaymentStatus, UserAddress } from '../../../core/types';
import type { CartTotals } from './pricing';
import type { DeliveryAddress } from './addressStore';
import { payChoiceMeta, type PayChoice } from './checkoutSession';

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
    deliveryOtp: newDeliveryOtp(),
  }).catch(() => null);
};
