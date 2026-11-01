import React from 'react';
import { AlertTriangle, Check, CheckCircle2, HelpCircle, MapPin, Receipt, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useDeliveryAddress, useDeliveryMinutes } from './components/shared';

interface PaymentResultParams {
  orderId?: string;
  amount?: number;
  method?: string;
}

const METHOD_LABEL: Record<string, string> = {
  gpay: 'UPI (Google Pay)',
  phonepe: 'UPI (PhonePe)',
  paytm: 'UPI (Paytm)',
  bhim: 'UPI (BHIM)',
  card: 'Credit or debit card',
  cod: 'Cash on delivery',
};

export const PaymentSuccessScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const address = useDeliveryAddress();
  const minutes = useDeliveryMinutes();
  const amountLabel = params.amount === undefined ? '—' : `₹${params.amount}`;

  // Opened without an order (for example a refresh), so there is nothing to confirm.
  if (!params.orderId) {
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
            <Receipt size={32} />
          </span>
          <h1>No order to show</h1>
          <p>We couldn’t find a recent order on this screen. Your orders list has every order you placed.</p>
        </div>
        <footer className="commerce-sticky-bar">
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Continue shopping
          </button>
          <button className="commerce-primary" onClick={() => navigate('orders-list')}>
            View orders
          </button>
        </footer>
      </main>
    );
  }

  return (
    <main className="commerce-screen commerce-result is-success">
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className="commerce-result-icon is-success">
          <CheckCircle2 size={34} />
        </span>
        <h1>Order placed</h1>
        <p>{params.method === 'cod' ? 'Keep the amount ready for the rider.' : 'Your payment is confirmed.'}</p>

        <dl className="commerce-result-meta">
          <div>
            <dt>Order no.</dt>
            <dd>{params.orderId}</dd>
          </div>
          <div>
            <dt>{params.method === 'cod' ? 'Amount to pay' : 'Amount paid'}</dt>
            <dd>{amountLabel}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{METHOD_LABEL[params.method || ''] || '—'}</dd>
          </div>
        </dl>

        <section className="commerce-card commerce-arrival">
          <b>{minutes ? `Expected in about ${minutes} minutes` : 'Delivery time will show in order tracking'}</b>
          {address.fullAddress && (
            <p>
              <MapPin size={13} /> {address.fullAddress}
            </p>
          )}
          <ol>
            <li className="is-done">
              <Check size={14} /> Order placed
            </li>
            <li>
              <span className="commerce-step-dot" /> Packing
            </li>
            <li>
              <span className="commerce-step-dot" /> Out for delivery
            </li>
            <li>
              <span className="commerce-step-dot" /> Delivered
            </li>
          </ol>
        </section>

        <p className="commerce-notice">Keep your delivery OTP handy. The rider will ask for it at handover.</p>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('home')}>
          Continue shopping
        </button>
        <button className="commerce-primary" onClick={() => navigate('orders-tracking', { orderId: params.orderId })}>
          Track order
        </button>
      </footer>
    </main>
  );
};

export const PaymentFailedScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;

  return (
    <main className="commerce-screen commerce-result is-failed">
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
        <button className="commerce-icon-btn" onClick={() => navigate('profile-support')} aria-label="Get help">
          <HelpCircle size={18} />
        </button>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className="commerce-result-icon is-failed">
          <AlertTriangle size={34} />
        </span>
        <h1>Payment didn’t go through</h1>
        <p>No payment was confirmed for this order. Your cart is unchanged, so you can try again or pick another method.</p>

        <dl className="commerce-result-meta">
          {params.method && (
            <div>
              <dt>Method tried</dt>
              <dd>{METHOD_LABEL[params.method] || '—'}</dd>
            </div>
          )}
          {params.orderId && (
            <div>
              <dt>Order ID</dt>
              <dd>{params.orderId}</dd>
            </div>
          )}
          <div>
            <dt>Amount</dt>
            <dd>{params.amount === undefined ? '—' : `₹${params.amount}`}</dd>
          </div>
        </dl>

        <p className="commerce-notice">If money left your account, your bank or Razorpay returns it within their usual refund time.</p>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('cart-tab')}>
          Back to cart
        </button>
        <button className="commerce-primary" onClick={() => navigate('checkout-payment-method')}>
          Try again
        </button>
      </footer>
    </main>
  );
};
