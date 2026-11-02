import type { CartItem } from '../../../core/state/cartStore';
import { COUPON_VALUES, deliveryFeeFor, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';

// One rule set for the cart, checkout, express checkout and the payment amount: shared/pricing-rules.mjs,
// the same file the payments server reads. Free delivery applies when the item total is above FREE_DELIVERY_ABOVE.
export { FREE_DELIVERY_ABOVE };

// Codes come from COUPON_VALUES. Returns the normalised code, or null when the code is not a real coupon.
export const normaliseCoupon = (code: string | null | undefined): string | null => {
  const key = (code || '').trim().toUpperCase();
  return key && Object.prototype.hasOwnProperty.call(COUPON_VALUES, key) ? key : null;
};

export const couponValue = (code: string): number => COUPON_VALUES[code] ?? 0;

export interface CartTotals {
  itemCount: number;
  itemTotal: number;
  catalogSavings: number;
  discountedTotal: number;
  couponCode: string | null;
  couponDiscount: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  amountNeededForFreeDelivery: number;
  freeDeliveryProgress: number;
  grandTotal: number;
  totalSavings: number;
}

// area is the delivery address text; the fee for an area is matched inside it (AREA_DELIVERY_FEES).
export const computeCartTotals = (items: CartItem[], couponCode: string | null, area = ''): CartTotals => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Falls back to the selling price when no MRP is stored, so no savings are invented.
  const itemTotal = items.reduce((sum, item) => sum + Math.max(item.mrp ?? item.price, item.price) * item.quantity, 0);
  const discountedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const catalogSavings = itemTotal - discountedTotal;
  const code = normaliseCoupon(couponCode);
  const couponDiscount = code ? Math.min(couponValue(code), discountedTotal) : 0;
  const isFreeDelivery = discountedTotal > FREE_DELIVERY_ABOVE;
  const deliveryFee = items.length === 0 ? 0 : deliveryFeeFor({ itemTotal: discountedTotal, area });
  const grandTotal = Math.max(0, discountedTotal - couponDiscount + deliveryFee);

  return {
    itemCount,
    itemTotal,
    catalogSavings,
    discountedTotal,
    couponCode: code,
    couponDiscount,
    deliveryFee,
    isFreeDelivery,
    // "Above ₹499" means the item total has to reach ₹500.
    amountNeededForFreeDelivery: isFreeDelivery ? 0 : FREE_DELIVERY_ABOVE + 1 - discountedTotal,
    freeDeliveryProgress: Math.min(1, discountedTotal / (FREE_DELIVERY_ABOVE + 1)),
    grandTotal,
    totalSavings: catalogSavings + couponDiscount,
  };
};
