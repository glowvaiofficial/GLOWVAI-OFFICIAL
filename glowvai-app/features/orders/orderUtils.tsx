import React, { useState } from 'react';
import { ArrowRight, Package, PackageOpen } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { PRODUCTS } from '../../data/products';
import type { Order, OrderItem } from '../../types';

// Helpers shared by the order screens. Everything shown comes from the saved order; nothing is invented.

export type OrderTone = 'active' | 'delivered' | 'cancelled';

export const STATUS_LABEL: Record<Order['status'], string> = {
  order_placed: 'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Being packed',
  rider_assigned: 'Rider assigned',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  upi: 'UPI',
  card: 'Card',
  cod: 'Cash on delivery',
  netbanking: 'Net banking',
};

export const DELIVERY_STAGES = ['Confirmed', 'Packed', 'On the way', 'Delivered'] as const;

export const orderTone = (order: Order): OrderTone =>
  order.status === 'cancelled' ? 'cancelled' : order.status === 'delivered' ? 'delivered' : 'active';

export const isActiveOrder = (order: Order) => orderTone(order) === 'active';

/** Index into DELIVERY_STAGES for the order's current status. */
export const stageIndex = (order: Order): number => {
  if (order.status === 'delivered') return 3;
  if (order.status === 'rider_assigned' || order.status === 'on_the_way') return 2;
  if (order.status === 'preparing') return 1;
  return 0;
};

export const formatRupee = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

/** Orders store either an ISO timestamp or a short display string such as "02:15 PM". */
export const formatOrderDate = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }
  return value;
};

export const itemCountLabel = (order: Order) => {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} item${count === 1 ? '' : 's'}`;
};

export const paymentSummary = (order: Order): string => {
  if (order.paymentStatus === 'successful') return `Paid by ${PAYMENT_LABEL[order.paymentMethod]}`;
  if (order.paymentMethod === 'cod' && order.status !== 'cancelled') return 'Pay on delivery';
  if (order.paymentStatus === 'processing') return 'Refund in progress';
  if (order.paymentStatus === 'failed') return 'Payment failed';
  if (order.paymentStatus === 'cancelled') return 'Payment cancelled';
  return `Payment ${order.paymentStatus}`;
};

/** Finds the order named in the route params, or falls back to the active order. */
export const useRequestedOrder = (): { order: Order | null; requestedId: string | null } => {
  const { activeParams, activeOrder, orders } = useApp();
  const requestedId: string | null = activeParams?.orderId || activeParams?.id || null;
  if (requestedId) {
    const match = orders.find((entry) => entry.id === requestedId) ?? (activeOrder?.id === requestedId ? activeOrder : null);
    return { order: match ?? null, requestedId };
  }
  return { order: activeOrder ?? orders[0] ?? null, requestedId: null };
};

/** Adds the same products (and sizes) back to the bag, then opens the cart. */
export const useBuyAgain = () => {
  const { addToCart, navigate, showToast } = useApp();
  return (order: Order) => {
    let added = 0;
    order.items.forEach((item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.productId);
      if (!product) return;
      const variant = product.variants.find((entry) => entry.size === item.variantSize) ?? product.variants.find((entry) => entry.id === product.currentVariantId);
      if (!variant || !variant.inStock) return;
      addToCart(product, variant.id, item.insuranceSelected);
      added += 1;
    });
    if (added === 0) {
      showToast('These items are not available right now');
      return;
    }
    showToast(added === order.items.length ? 'Items added to your bag' : 'Available items added to your bag');
    navigate('cart');
  };
};

/** Product photo with a neutral tile when the image is missing or fails to load. */
export const OrderThumb: React.FC<{ item: OrderItem; className?: string }> = ({ item, className }) => {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <span className={`orders-thumb is-fallback${className ? ` ${className}` : ''}`} role="img" aria-label={item.productName}>
        <Package size={20} />
      </span>
    );
  }
  return <img className={`orders-thumb${className ? ` ${className}` : ''}`} src={item.imageUrl} alt={item.productName} loading="lazy" onError={() => setFailed(true)} />;
};

interface OrdersEmptyProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const OrdersEmpty: React.FC<OrdersEmptyProps> = ({ title, body, actionLabel = 'Start shopping', onAction }) => {
  const { navigate } = useApp();
  return (
    <section className="orders-empty-state">
      <span className="orders-empty-icon">
        <PackageOpen size={30} />
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" className="orders-primary-button" onClick={onAction ?? (() => navigate('home'))}>
        {actionLabel} <ArrowRight size={16} />
      </button>
    </section>
  );
};
