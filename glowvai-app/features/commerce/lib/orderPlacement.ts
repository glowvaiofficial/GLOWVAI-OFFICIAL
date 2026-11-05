import type { CartItem } from '../../../core/state/cartStore';
import { placeOrder } from '../../../core/services/shopApi';
import { AREA_DELIVERY_FEES } from '../../../shared/pricing-rules.mjs';
import type { DeliveryAddress } from './addressStore';

export interface PlaceOrderInput {
  items: CartItem[];
  address: DeliveryAddress;
  couponCode: string | null;
  // Used when the delivery address has no recipient name or phone of its own.
  customer: { name: string; phone: string };
}

// The service area named in the address, so the server works out the same delivery fee the bill showed.
const areaIn = (text: string): string | undefined => {
  const haystack = text.toLowerCase();
  const match = [...AREA_DELIVERY_FEES]
    .sort((a, b) => String(b[0]).length - String(a[0]).length)
    .find(([name]) => haystack.includes(String(name).toLowerCase()));
  return match ? String(match[0]) : undefined;
};

// Places a cash-on-delivery order through the shop server (POST /api/shop/orders). Only product ids and quantities
// are sent: the server prices every item from the published catalogue, applies the coupon and delivery fee, and
// creates the order id. The result carries the server's message when the order is refused.
export const placeCartOrder = async ({ items, address, couponCode, customer }: PlaceOrderInput) =>
  placeOrder({
    items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    address: {
      name: address.recipientName || customer.name,
      phone: address.phoneNumber || customer.phone,
      fullAddress: address.fullAddress,
      city: address.city,
      pincode: address.pincode,
      area: areaIn(address.fullAddress),
      landmark: address.landmark,
    },
    couponCode,
  });
