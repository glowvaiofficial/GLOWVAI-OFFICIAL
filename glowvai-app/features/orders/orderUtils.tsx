import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Package, PackageOpen } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getLiveCatalog } from '../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../core/state/cartStore';
import { defaultVariant, lineKeyOf } from '../../../lib/shop/variants';
import { useCustomerStore } from '../../core/state/customerStore';
import type { ShopOrder, ShopOrderItem } from '../../core/services/shopApi';

// Helpers shared by the order screens. Orders come from the GlowVai server (GET /api/shop/orders), with any update
// the GlowVai team made applied. Nothing is invented on the device: no rider, no ETA, no map.

export type OrderTone = 'active' | 'delivered' | 'cancelled';

const KNOWN_STATUS: Record<string, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  ACCEPTED: 'Confirmed',
  VENDOR_ACCEPTED: 'Store accepted your order',
  PACKED: 'Packed, waiting for pickup',
  DISPATCHED: 'On the way',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  VENDOR_REJECTED: 'Cancelled by the store',
};

export const statusLabel = (status: string): string => {
  const key = String(status || '').toUpperCase();
  if (KNOWN_STATUS[key]) return KNOWN_STATUS[key];
  const text = key.replace(/_/g, ' ').toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Status not available';
};

// What each status means for the customer, in plain words.
export const statusNote = (order: ShopOrder): string => {
  switch (String(order.status).toUpperCase()) {
    case 'PLACED':
      return 'We have your order. The GlowVai team will confirm it and prepare it for delivery. You can still cancel it.';
    case 'VENDOR_ACCEPTED':
      return 'A GlowVai partner store accepted your order and is getting it ready. You can still cancel it until it is packed.';
    case 'PACKED':
      return 'Your order is packed at the store and waiting for pickup.';
    case 'DELIVERED':
      return 'This order was delivered.';
    case 'CANCELLED':
    case 'VENDOR_REJECTED':
      return order.cancellationReason ? `Cancelled: ${order.cancellationReason}` : 'This order was cancelled and will not be delivered.';
    default:
      return 'The GlowVai team is working on this order. This page shows each update they record.';
  }
};

export const orderTone = (order: ShopOrder): OrderTone => {
  const status = String(order.status).toUpperCase();
  if (status === 'CANCELLED' || status === 'VENDOR_REJECTED') return 'cancelled';
  if (status === 'DELIVERED') return 'delivered';
  return 'active';
};

export const isActiveOrder = (order: ShopOrder) => orderTone(order) === 'active';

// An order can be cancelled from the shop until it is packed; the server checks this again.
export const canCancel = (order: ShopOrder) => ['PLACED', 'VENDOR_ACCEPTED'].includes(String(order.status).toUpperCase());

export const formatRupee = (amount: number) => `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;

export const formatOrderDate = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(typeof value === 'number' ? value : Number(value) || String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const itemCountLabel = (order: ShopOrder) => {
  const count = order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  return `${count} item${count === 1 ? '' : 's'}`;
};

export const orderTotal = (order: ShopOrder): number => Number(order.pricing?.grandTotal) || 0;

export const paymentSummary = (order: ShopOrder): string => {
  const method = String(order.payment?.method || 'COD').toUpperCase();
  const status = String(order.payment?.status || 'PENDING').toUpperCase();
  if (status === 'PAID' || status === 'COMPLETED') return method === 'COD' ? 'Paid on delivery' : 'Paid';
  if (orderTone(order) === 'cancelled') return method === 'COD' ? 'Cash on delivery (nothing to pay)' : 'Payment cancelled';
  return method === 'COD' ? 'Pay on delivery' : `Payment ${status.toLowerCase()}`;
};

export const addressLine = (order: ShopOrder): string => {
  const a = order.shippingAddress;
  if (!a) return '';
  return [a.fullAddress, a.city, a.pincode].filter(Boolean).join(', ');
};

// Loads the customer's orders from the server when a screen opens.
export const useShopOrders = () => {
  const orders = useCustomerStore((s) => s.orders);
  const status = useCustomerStore((s) => s.ordersStatus);
  const error = useCustomerStore((s) => s.ordersError);
  const load = useCustomerStore((s) => s.loadOrders);
  useEffect(() => {
    void load();
  }, [load]);
  return { orders, status, error, reload: load };
};

/** Finds the order named in the route params, or the most recent order. */
export const useRequestedOrder = () => {
  const { activeParams } = useApp();
  const { orders, status, error, reload } = useShopOrders();
  const requestedId: string | null = activeParams?.orderId || activeParams?.id || null;
  const order = requestedId ? orders.find((entry) => entry.orderId === requestedId) ?? null : orders[0] ?? null;
  return { order, requestedId, status, error, reload };
};

/** Adds the products that are still on sale back to the bag, at today's price, then opens the cart. */
export const useBuyAgain = () => {
  const { navigate, showToast } = useApp();
  return (order: ShopOrder) => {
    const catalog = getLiveCatalog();
    const { addItem, incrementItem } = useCartStore.getState();
    let added = 0;
    order.items.forEach((item) => {
      const product = catalog.find((entry) => entry.id === item.productId);
      if (!product || !(product.price > 0)) return;
      // The size or shade bought last time, when the product still has it; otherwise the default one.
      const picked = product.variants?.find((v) => v.id === item.variantId) ?? (product.variants?.length ? defaultVariant(product.variants) : null);
      const line = picked
        ? { productId: product.id, variantId: picked.id, variantLabel: picked.label, price: picked.price, mrp: picked.mrp }
        : { productId: product.id, price: product.price, mrp: product.originalPrice };
      addItem({
        name: product.name,
        brand: product.brand,
        image: product.official_brand_image_url || item.imageUrl || '',
        ...line,
      });
      for (let i = 1; i < (Number(item.quantity) || 1); i += 1) incrementItem(lineKeyOf(product.id, line.variantId));
      added += 1;
    });
    if (added === 0) {
      showToast('These items are not available right now');
      return;
    }
    showToast(added === order.items.length ? 'Items added to your bag' : 'Available items added to your bag');
    navigate('cart-tab');
  };
};

/** Product photo with a neutral tile when the image is missing or fails to load. */
export const OrderThumb: React.FC<{ item: ShopOrderItem; className?: string }> = ({ item, className }) => {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <span className={`orders-thumb is-fallback${className ? ` ${className}` : ''}`} role="img" aria-label={item.title}>
        <Package size={20} />
      </span>
    );
  }
  return <img className={`orders-thumb${className ? ` ${className}` : ''}`} src={item.imageUrl} alt={item.title} loading="lazy" onError={() => setFailed(true)} />;
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

/** Loading and error states while the orders come from the server. Returns null once they are ready. */
export const OrdersLoadState: React.FC<{ status: string; error: string | null; onRetry: () => void; hasOrders: boolean }> = ({ status, error, onRetry, hasOrders }) => {
  if (hasOrders && status !== 'error') return null;
  if (status === 'error') {
    return (
      <section className="orders-empty-state" role="alert">
        <span className="orders-empty-icon">
          <AlertTriangle size={30} />
        </span>
        <h2>Orders could not be loaded</h2>
        <p>{error || 'Check your connection and try again.'}</p>
        <button type="button" className="orders-primary-button" onClick={onRetry}>
          Try again <ArrowRight size={16} />
        </button>
      </section>
    );
  }
  if (status === 'idle' || status === 'loading') {
    return (
      <section className="orders-empty-state" role="status">
        <span className="orders-empty-icon">
          <PackageOpen size={30} />
        </span>
        <h2>Loading your orders…</h2>
        <p>Getting the latest status from GlowVai.</p>
      </section>
    );
  }
  return null;
};
