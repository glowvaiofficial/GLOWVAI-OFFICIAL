import React from 'react';
import { ReceiptText, RotateCcw, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Order } from '../types';

const paymentState = (order: Order): { label: string; value: string; note: string } => {
  if (order.paymentStatus === 'processing') {
    return { label: 'Refund status', value: 'Pending review', note: 'Your cancellation is recorded. Our team will confirm the refund to your original payment method.' };
  }
  return { label: 'Payment status', value: 'Not charged', note: 'No payment was collected for this order.' };
};

export const OrderCancelledScreen: React.FC = () => {
  const { activeOrder, navigate } = useApp();
  const order = activeOrder?.status === 'cancelled' ? activeOrder : null;
  const payment = order ? paymentState(order) : null;

  return (
    <main className="commerce-screen commerce-result is-cancelled">
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
        <span>Order update</span>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className={order ? 'commerce-result-icon is-failed' : 'commerce-result-icon is-neutral'}>{order ? <X size={32} /> : <ReceiptText size={30} />}</span>
        <h1>{order ? 'Order cancelled' : 'No cancelled order to show'}</h1>
        <p>{order && payment ? payment.note : 'Open an order from your orders list to see its cancellation details.'}</p>

        {order && payment && (
          <dl className="commerce-result-meta">
            <div>
              <dt>Order ID</dt>
              <dd>#{order.id}</dd>
            </div>
            <div>
              <dt>Order total</dt>
              <dd>₹{order.finalPayable}</dd>
            </div>
            <div>
              <dt>{payment.label}</dt>
              <dd>{payment.value}</dd>
            </div>
          </dl>
        )}
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('orders-list')}>
          View all orders
        </button>
        <button className="commerce-primary" onClick={() => navigate('home')}>
          <RotateCcw size={17} /> Shop again
        </button>
      </footer>
    </main>
  );
};
