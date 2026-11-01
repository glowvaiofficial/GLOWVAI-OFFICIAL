import { useCartStore } from '../../../core/state/cartStore';
import { useCheckoutSession } from './checkoutSession';
import { computeCartTotals } from './pricing';

// Item count and payable total from the same cart and pricing the cart page uses, so the header and the
// floating cart pill always match it.
export const useCartSummary = (): { itemCount: number; grandTotal: number } => {
  const items = useCartStore((s) => s.items);
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const totals = computeCartTotals(Object.values(items), couponApplied);
  return { itemCount: totals.itemCount, grandTotal: totals.grandTotal };
};
