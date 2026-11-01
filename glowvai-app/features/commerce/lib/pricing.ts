import type { CartItem } from '../../../core/state/cartStore';

// Same thresholds and coupon rule as the mobile cart screen.
export const FREE_DELIVERY_THRESHOLD = 2198;
export const STANDARD_DELIVERY_FEE = 49;
export const COUPON_CODE = 'GLOW10';
export const COUPON_RATE = 0.1;
export const COUPON_CAP = 150;

export interface CartTotals {
  itemCount: number;
  itemTotal: number;
  catalogSavings: number;
  discountedTotal: number;
  couponDiscount: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  amountNeededForFreeDelivery: number;
  freeDeliveryProgress: number;
  grandTotal: number;
  totalSavings: number;
}

export const computeCartTotals = (items: CartItem[], couponApplied: boolean): CartTotals => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Falls back to the selling price when no MRP is stored, so no savings are invented.
  const itemTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discountedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const catalogSavings = itemTotal - discountedTotal;
  const couponDiscount = couponApplied ? Math.min(COUPON_CAP, Math.round(discountedTotal * COUPON_RATE)) : 0;
  const isFreeDelivery = discountedTotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = isFreeDelivery ? 0 : STANDARD_DELIVERY_FEE;
  const grandTotal = discountedTotal - couponDiscount + deliveryFee;
  const totalSavings = catalogSavings + couponDiscount + (isFreeDelivery ? STANDARD_DELIVERY_FEE : 0);

  return {
    itemCount,
    itemTotal,
    catalogSavings,
    discountedTotal,
    couponDiscount,
    deliveryFee,
    isFreeDelivery,
    amountNeededForFreeDelivery: Math.max(0, FREE_DELIVERY_THRESHOLD - discountedTotal),
    freeDeliveryProgress: Math.min(1, discountedTotal / FREE_DELIVERY_THRESHOLD),
    grandTotal,
    totalSavings,
  };
};
