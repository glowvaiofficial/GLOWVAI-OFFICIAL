import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';

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
  const orderId = params.orderId || 'GV-PENDING';

  return (
    <main className="commerce-screen commerce-result is-success">
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
        <span className="commerce-chip-static">Order confirmed</span>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className="commerce-result-icon is-success">
          <CheckCircle2 size={34} />
        </span>
        <h1>Order confirmed!</h1>
        <p>Your glow is on its way.</p>

        <dl className="commerce-result-meta">
          <div>
            <dt>Order no.</dt>
            <dd>{orderId}</dd>
          </div>
          <div>
            <dt>{params.method === 'cod' ? 'Amount to pay' : 'Amount paid'}</dt>
            <dd>₹{params.amount ?? 0}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{METHOD_LABEL[params.method || ''] || 'Online payment'}</dd>
          </div>
        </dl>

        <section className="commerce-card commerce-arrival">
          <b>Arriving in about 10 minutes</b>
          <p>
            <MapPin size={13} /> Dispatched from the nearest Glowway darkstore
          </p>
          <ol>
            <li className="is-done">Order placed</li>
            <li className="is-active">Packing your order</li>
            <li>Out for delivery</li>
            <li>Arrived</li>
          </ol>
        </section>

        <p className="commerce-notice">Keep your delivery OTP handy. The rider will ask for it at handover.</p>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('home')}>
          Continue shopping
        </button>
        <button className="commerce-primary" onClick={() => navigate('orders-tracking', { orderId })}>
          Track order live
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
        <p>No amount has been confirmed for this order. You can try again with the same cart.</p>

        <dl className="commerce-result-meta">
          {params.orderId && (
            <div>
              <dt>Order ID</dt>
              <dd>{params.orderId}</dd>
            </div>
          )}
          <div>
            <dt>Amount</dt>
            <dd>₹{params.amount ?? 0}</dd>
          </div>
        </dl>
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
