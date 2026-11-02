import { useCartStore } from '../../core/state/cartStore';

// The cart the shop screens add to (product cards, product page, cart, checkout), so the header and the
// floating cart bar always show the same items and amount as the cart screen.
export const useShellCart = () => {
  const count = useCartStore((s) => s.totalCount);
  const total = useCartStore((s) => s.totalPrice);
  return { count, total, totalLabel: `₹${total.toLocaleString('en-IN')}` };
};

export const itemsLabel = (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`;
