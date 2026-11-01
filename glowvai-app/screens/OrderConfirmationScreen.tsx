import React from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, MapPin, ShoppingBag, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Order } from '../types';

const STAGES = ['Order placed', 'Packing', 'Out for delivery', 'Delivered'];

// Where the order is in the four visible stages, from its real status.
const stageIndex = (status: Order['status']): number => {
  switch (status) {
    case 'preparing':
      return 1;
    case 'rider_assigned':
    case 'on_the_way':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
};

const paymentLabel = (order: Order): string => {
  if (order.paymentStatus === 'successful') return 'Paid';
  if (order.paymentMethod === 'cod') return 'Pay on delivery';
  return 'Payment pending';
};

export const OrderConfirmationScreen: React.FC = () => {
  const { navigate, activeOrder, showToast } = useApp();

  if (!activeOrder) {
    return (
      <main className="commerce-screen commerce-result">
        <header className="commerce-result-head">
          <span className="commerce-brand">
            <Sparkles size={16} />
            glowvai
          </span>
        </header>
        <div className="commerce-body commerce-result-body">
          <span className="commerce-result-icon is-neutral">
            <ShoppingBag size={32} />
          </span>
          <h1>No active order</h1>
          <p>Place an order to see its confirmation and delivery progress here.</p>
        </div>
        <footer className="commerce-sticky-bar">
          <button className="commerce-ghost" onClick={() => navigate('orders-list')}>
            View orders
          </button>
          <button className="commerce-primary" onClick={() => navigate('home')}>
            Continue shopping
          </button>
        </footer>
      </main>
    );
  }

  const order = activeOrder;
  const current = stageIndex(order.status);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const copyOrderId = async () => {
    try {
      await navigator.clipboard?.writeText(order.id);
      showToast('Order ID copied');
    } catch {
      showToast('Could not copy the order ID');
    }
  };

  return (
    <main className="commerce-screen commerce-result is-success commerce-order-receipt">
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
        <span>{order.createdAt}</span>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className="commerce-result-icon is-success">
          <CheckCircle2 size={34} />
        </span>
        <h1>Order placed</h1>
        <p>We’ve received your order and will update you as it moves.</p>
        <button className="commerce-copy-id" onClick={copyOrderId} aria-label={`Copy order ID ${order.id}`}>
          Order #{order.id} <Copy size={14} />
        </button>

        <section className="commerce-card commerce-arrival" aria-label="Order progress">
          <b>{order.status === 'delivered' ? 'Delivered' : order.estimatedDeliveryMinutes ? `Expected in about ${order.estimatedDeliveryMinutes} minutes` : 'Delivery time is shown in order tracking'}</b>
          <ol>
            {STAGES.map((label, index) => {
              // "Order placed" is always done; later stages are done once the order has moved past them.
              const done = index === 0 || index < current || order.status === 'delivered';
              return (
                <li key={label} className={done ? 'is-done' : index === current ? 'is-active' : ''}>
                  {done ? <Check size={14} /> : <span className="commerce-step-dot" />}
                  {label}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="commerce-card commerce-receipt-block">
          <div className="commerce-card-head">
            <h2>Delivering to</h2>
          </div>
          <p className="commerce-muted">
            <MapPin size={14} />
            <span>
              {[order.address.street, order.address.area].filter(Boolean).join(', ') || '—'}
              <br />
              {[order.address.city, order.address.pincode].filter(Boolean).join(' · ')}
            </span>
          </p>
        </section>

        <section className="commerce-card commerce-receipt-block">
          <div className="commerce-card-head">
            <h2>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </h2>
          </div>
          {order.items.map((item) => (
            <div className="commerce-review-line" key={`${item.productId}-${item.variantSize}`}>
              <div className="commerce-thumb">
                {item.imageUrl ? <img src={item.imageUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <ShoppingBag size={20} />}
              </div>
              <div>
                <small>{item.brand}</small>
                <h3>{item.productName}</h3>
                <p>
                  {item.variantSize ? `${item.variantSize} · ` : ''}Qty {item.quantity}
                </p>
              </div>
              <b className="commerce-review-price">₹{item.unitPrice * item.quantity}</b>
            </div>
          ))}
        </section>

        <section className="commerce-card commerce-bill commerce-receipt-block">
          <h2>Payment</h2>
          <dl>
            <div>
              <dt>Item total</dt>
              <dd>₹{order.itemSubtotal}</dd>
            </div>
            {order.discount > 0 && (
              <div className="is-saving">
                <dt>Discount</dt>
                <dd>−₹{order.discount}</dd>
              </div>
            )}
            {order.insuranceTotal > 0 && (
              <div>
                <dt>Beauty protection</dt>
                <dd>₹{order.insuranceTotal}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd className={order.deliveryFee === 0 ? 'is-good' : undefined}>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</dd>
            </div>
            <div className="commerce-bill-total">
              <dt>{paymentLabel(order)}</dt>
              <dd>₹{order.finalPayable}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('home')}>
          Continue shopping
        </button>
        <button className="commerce-primary" onClick={() => navigate('order-tracking', { orderId: order.id })}>
          Track order <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
};
