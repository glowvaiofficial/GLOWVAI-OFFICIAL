import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, MapPin, ReceiptText, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useDeliveryAddress } from './components/shared';

interface PaymentResultParams {
  orderId?: string;
  amount?: number;
  method?: string;
  confirmed?: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  gpay: 'UPI (Google Pay)',
  phonepe: 'UPI (PhonePe)',
  paytm: 'UPI (Paytm)',
  bhim: 'UPI (BHIM)',
  card: 'Credit or debit card',
  cod: 'Cash on delivery',
};

const ResultHeader: React.FC<{ right?: React.ReactNode }> = ({ right }) => (
  <header className="commerce-result-head">
    <span className="commerce-brand">
      <Sparkles size={16} />
      glowvai
    </span>
    {right}
  </header>
);

// Shown when a result screen is opened without a payment that this session just confirmed or attempted.
const NoResult: React.FC = () => {
  const { navigate } = useApp();
  return (
    <main className="commerce-screen commerce-result is-none">
      <ResultHeader />
      <div className="commerce-body commerce-result-body">
        <div className="commerce-result-status">
          <span className="commerce-result-icon is-neutral">
            <ReceiptText size={32} />
          </span>
          <h1>No recent payment</h1>
          <p>There is no order being paid for right now. Your orders list shows every order you have placed.</p>
        </div>
        <div className="commerce-result-actions">
          <button className="commerce-primary" onClick={() => navigate('orders-list')}>
            View my orders
          </button>
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Continue shopping
          </button>
        </div>
      </div>
    </main>
  );
};

export const PaymentSuccessScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const address = useDeliveryAddress();

  // Fail closed: success is shown only when the processing step confirmed this order.
  if (params.confirmed !== true || !params.orderId) return <NoResult />;

  const orderId = params.orderId;
  const isCod = params.method === 'cod';

  return (
    <main className="commerce-screen commerce-result is-success">
      <ResultHeader right={<span className="commerce-chip-static">{isCod ? 'Order placed' : 'Payment verified'}</span>} />

      <div className="commerce-body commerce-result-body">
        <div className="commerce-result-status">
          <span className="commerce-result-icon is-success">
            <CheckCircle2 size={34} />
          </span>
          <h1>Order placed</h1>
          <p>{isCod ? 'Keep the amount ready. You pay when the order arrives.' : 'Your payment is verified and the order is placed.'}</p>

          <dl className="commerce-result-meta">
            <div>
              <dt>Order no.</dt>
              <dd>{orderId}</dd>
            </div>
            {typeof params.amount === 'number' && (
              <div>
                <dt>{isCod ? 'Amount to pay on delivery' : 'Amount paid'}</dt>
                <dd>₹{params.amount}</dd>
              </div>
            )}
            <div>
              <dt>Payment</dt>
              <dd>{METHOD_LABEL[params.method || ''] || 'Online payment'}</dd>
            </div>
          </dl>
        </div>

        <div className="commerce-result-actions">
          {address && (
            <section className="commerce-card commerce-arrival">
              <b>{address.etaMinutes ? `Delivery in about ${address.etaMinutes} minutes` : 'Delivery details'}</b>
              <p>
                <MapPin size={13} /> {address.fullAddress}
              </p>
            </section>
          )}
          <p className="commerce-notice">Order tracking shows each update and your delivery OTP for the handover.</p>
          <button className="commerce-primary" onClick={() => navigate('orders-tracking', { orderId })}>
            Track order
          </button>
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Continue shopping
          </button>
        </div>
      </div>
    </main>
  );
};

export const PaymentFailedScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;

  if (!params.orderId) return <NoResult />;
  const isCod = params.method === 'cod';

  return (
    <main className="commerce-screen commerce-result is-failed">
      <ResultHeader
        right={
          <button className="commerce-icon-btn" onClick={() => navigate('profile-support')} aria-label="Get help">
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="commerce-body commerce-result-body">
        <div className="commerce-result-status">
          <span className="commerce-result-icon is-failed">
            <AlertTriangle size={34} />
          </span>
          <h1>{isCod ? 'Order not placed' : 'Payment not confirmed'}</h1>
          <p>
            {isCod
              ? 'We could not place this order. Your cart is unchanged, so you can try again.'
              : 'We could not verify a payment for this order, so it is not confirmed. Your cart is unchanged. If money left your account, your bank or Razorpay returns it.'}
          </p>

          <dl className="commerce-result-meta">
            <div>
              <dt>Order ID</dt>
              <dd>{params.orderId}</dd>
            </div>
            {typeof params.amount === 'number' && (
              <div>
                <dt>Amount</dt>
                <dd>₹{params.amount}</dd>
              </div>
            )}
            {params.method && (
              <div>
                <dt>Payment</dt>
                <dd>{METHOD_LABEL[params.method] || 'Online payment'}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="commerce-result-actions">
          <button className="commerce-primary" onClick={() => navigate('checkout-payment-method')}>
            Try again
          </button>
          <button className="commerce-ghost" onClick={() => navigate('cart-tab')}>
            Back to cart
          </button>
          <button className="commerce-link-block" onClick={() => navigate('profile-support')}>
            Contact support
          </button>
        </div>
      </div>
    </main>
  );
};
