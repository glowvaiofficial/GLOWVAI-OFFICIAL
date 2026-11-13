import type { CartItem } from '../../../core/state/cartStore';
import { COUPON_VALUES, deliveryFeeFor, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import type { BagQuote } from './checkoutSession';

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
  // The plain-words line for an automatic offer (no code), or null.
  offerLabel: string | null;
  deliveryFee: number;
  isFreeDelivery: boolean;
  amountNeededForFreeDelivery: number;
  freeDeliveryProgress: number;
  grandTotal: number;
  totalSavings: number;
}

// area is the delivery address text; the fee for an area is matched inside it (AREA_DELIVERY_FEES).
export const computeCartTotals = (items: CartItem[], couponCode: string | null, area = '', bag: BagQuote | null = null): CartTotals => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Falls back to the selling price when no MRP is stored, so no savings are invented.
  const itemTotal = items.reduce((sum, item) => sum + Math.max(item.mrp ?? item.price, item.price) * item.quantity, 0);
  const discountedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const catalogSavings = itemTotal - discountedTotal;
  // With the server's answer, its discount is used (it may be an automatic offer). Before the answer arrives, a built-in
  // code shows its fixed value; an offer code shows nothing until the server has checked it.
  const builtIn = normaliseCoupon(couponCode);
  const code = bag ? bag.code : builtIn;
  const couponDiscount = bag ? Math.min(bag.discount, discountedTotal) : builtIn ? Math.min(couponValue(builtIn), discountedTotal) : 0;
  const offerLabel = bag && !bag.code ? bag.label : null;
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
    offerLabel,
    deliveryFee,
    isFreeDelivery,
    // "Above ₹499" means the item total has to reach ₹500.
    amountNeededForFreeDelivery: isFreeDelivery ? 0 : FREE_DELIVERY_ABOVE + 1 - discountedTotal,
    freeDeliveryProgress: Math.min(1, discountedTotal / (FREE_DELIVERY_ABOVE + 1)),
    grandTotal,
    totalSavings: catalogSavings + couponDiscount,
  };
};
