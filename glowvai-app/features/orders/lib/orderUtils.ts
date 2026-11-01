import type { Order } from '../../../types';
import { PRODUCTS } from '../../../data/products';
import type { AppContextType } from '../../../context/contextDefinition';

/** The four stages a delivery passes through, in order. */
export const ORDER_STAGES = ['Placed', 'Packed', 'On the way', 'Delivered'] as const;

/** Index of the stage the order is at now (0-3). Cancelled orders return -1. */
export const stageIndex = (order: Order): number => {
  switch (order.status) {
    case 'cancelled':
      return -1;
    case 'delivered':
      return 3;
    case 'rider_assigned':
    case 'on_the_way':
      return 2;
    case 'preparing':
      return 1;
    default:
      return 0;
  }
};

export const isActiveOrder = (order: Order) => order.status !== 'delivered' && order.status !== 'cancelled';

export const STATUS_LABEL: Record<Order['status'], string> = {
  order_placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Being packed',
  rider_assigned: 'Partner assigned',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const statusTone = (order: Order): 'active' | 'done' | 'cancelled' =>
  order.status === 'cancelled' ? 'cancelled' : order.status === 'delivered' ? 'done' : 'active';

const parseDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "31 Oct 2026, 8:14 pm". Falls back to the stored text when it is not a date. */
export const formatOrderDate = (value: string): string => {
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** "31 Oct 2026". */
export const formatOrderDay = (value: string): string => {
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatRupees = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

export const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

export const paymentLabel = (order: Order): string => {
  if (order.paymentMethod === 'cod') return order.status === 'delivered' ? 'Cash on delivery' : 'Pay on delivery';
  const method = order.paymentMethod === 'upi' ? 'UPI' : order.paymentMethod === 'card' ? 'Card' : 'Net banking';
  if (order.paymentStatus === 'successful') return `Paid by ${method}`;
  if (order.paymentStatus === 'cancelled') return `${method} payment cancelled`;
  return `${method} payment ${order.paymentStatus}`;
};

/** Adds the same products and sizes from an order back to the cart. Returns how many lines were added. */
export const reorderItems = (order: Order, addToCart: AppContextType['addToCart']): number => {
  let added = 0;
  order.items.forEach((item) => {
    const product = PRODUCTS.find((entry) => entry.id === item.productId);
    if (!product) return;
    const variant =
      product.variants.find((entry) => entry.size === item.variantSize) ??
      product.variants.find((entry) => entry.id === product.currentVariantId);
    if (!variant || !variant.inStock) return;
    addToCart(product, variant.id, item.insuranceSelected);
    added += 1;
  });
  return added;
};

/** Ratings are kept in this browser only; there is no ratings service yet. */
export interface OrderRating {
  delivery: number;
  products: number;
  tags: string[];
  comment: string;
  ratedAt: string;
}

const RATINGS_KEY = 'glowvai:order-ratings';

export const loadRatings = (): Record<string, OrderRating> => {
  try {
    return JSON.parse(window.localStorage.getItem(RATINGS_KEY) || '{}') as Record<string, OrderRating>;
  } catch {
    return {};
  }
};

export const saveRating = (orderId: string, rating: OrderRating) => {
  try {
    window.localStorage.setItem(RATINGS_KEY, JSON.stringify({ ...loadRatings(), [orderId]: rating }));
  } catch {
    // Storage blocked: the thank-you state still shows, nothing else depends on it.
  }
};
