/**
 * Dynamic Pricing & Hyper-Local Demand Engine
 * Manages cart progress milestones, late-night convenience fees, surge rules, and rider tips.
 */

export interface CartCalculationInput {
  itemsTotal: number;
  appliedCouponDiscount?: number;
  selectedTipAmount?: number;
  donationAmount?: number;
  currentHour?: number;
  activeOrdersInGrid?: number;
  availableRidersInGrid?: number;
}

export interface CartPricingBreakdown {
  itemsTotal: number;
  mrpTotal: number;
  mrpDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  isFreeDeliveryUnlocked: boolean;
  freeDeliveryThreshold: number;
  amountNeededForFreeDelivery: number;
  lateNightFee: number;
  handlingFee: number;
  tipAmount: number;
  donationAmount: number;
  surgeMultiplier: number;
  surgeNotice?: string;
  totalSavings: number;
  grandTotal: number;
}

const FREE_DELIVERY_THRESHOLD = 199;
const STANDARD_DELIVERY_FEE = 30;

/**
 * Computes dynamic pricing, fee waivers, and savings milestones
 */
export const calculateDynamicCartPricing = (
  input: CartCalculationInput
): CartPricingBreakdown => {
  const {
    itemsTotal,
    appliedCouponDiscount = 0,
    selectedTipAmount = 0,
    donationAmount = 0,
    currentHour = new Date().getHours(),
    activeOrdersInGrid = 4,
    availableRidersInGrid = 6,
  } = input;

  const mrpTotal = Math.round(itemsTotal * 1.25); // Estimated MRP before 20-25% discount
  const mrpDiscount = mrpTotal - itemsTotal;

  // 1. Free Delivery Milestone Calculation
  const isFreeDeliveryUnlocked = itemsTotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = isFreeDeliveryUnlocked ? 0 : STANDARD_DELIVERY_FEE;
  const amountNeededForFreeDelivery = isFreeDeliveryUnlocked
    ? 0
    : FREE_DELIVERY_THRESHOLD - itemsTotal;

  // 2. Late Night Convenience Fee (11 PM - 5 AM: ₹15)
  const isLateNight = currentHour >= 23 || currentHour < 5;
  const lateNightFee = isLateNight ? 0 : 0; // Set to ₹0 as promotional waiver

  // 3. Transparent Handling Fee
  const handlingFee = 0; // Always FREE

  // 4. Surge Calculation (if order demand exceeds rider supply by 2x)
  let surgeMultiplier = 1.0;
  let surgeNotice: string | undefined = undefined;

  if (availableRidersInGrid > 0 && activeOrdersInGrid / availableRidersInGrid > 2.0) {
    surgeMultiplier = 1.15;
    surgeNotice = 'High demand in your area. Dedicated express riders assigned.';
  }

  // Total Savings = MRP discount + Delivery fee waiver + Coupon discount
  const deliverySavings = isFreeDeliveryUnlocked ? STANDARD_DELIVERY_FEE : 0;
  const totalSavings = mrpDiscount + deliverySavings + appliedCouponDiscount;

  // Grand Total
  const subtotalAfterCoupon = Math.max(0, itemsTotal - appliedCouponDiscount);
  const rawGrandTotal =
    subtotalAfterCoupon +
    deliveryFee +
    lateNightFee +
    handlingFee +
    selectedTipAmount +
    donationAmount;

  const grandTotal = Math.max(30, Math.round(rawGrandTotal * surgeMultiplier));

  return {
    itemsTotal,
    mrpTotal,
    mrpDiscount,
    couponDiscount: appliedCouponDiscount,
    deliveryFee,
    isFreeDeliveryUnlocked,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    amountNeededForFreeDelivery,
    lateNightFee,
    handlingFee,
    tipAmount: selectedTipAmount,
    donationAmount,
    surgeMultiplier,
    surgeNotice,
    totalSavings,
    grandTotal,
  };
};
