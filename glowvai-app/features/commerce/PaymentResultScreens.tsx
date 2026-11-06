import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, HelpCircle, MapPin, ReceiptText, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useDeliveryAddress } from './components/shared';
import { PAY_METHOD_LABEL, parsePayMethod } from './lib/paymentMethod';
import { formatAddressForDisplay } from './lib/displayText';

interface PaymentResultParams {
  orderId?: string;
  amount?: number;
  method?: string;
  confirmed?: boolean;
  error?: string;
}

interface ResultHeaderProps {
  right?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

const ResultHeader: React.FC<ResultHeaderProps> = ({ right, onBack, backLabel }) => (
  <header className="commerce-result-head">
    <span className="commerce-result-head-start">
      {onBack && (
        <button className="commerce-icon-btn" onClick={onBack} aria-label={backLabel ?? 'Go back'}>
          <ArrowLeft size={20} />
        </button>
      )}
      <span className="commerce-brand">
        <Sparkles size={16} />
        glowvai
      </span>
    </span>
    {right}
  </header>
);

// Shown when a result screen is opened without a payment that this session just confirmed or attempted.
const NoResult: React.FC = () => {
  const { navigate } = useApp();
  return (
    <main className="commerce-screen commerce-result is-none">
      <ResultHeader onBack={() => navigate('home')} backLabel="Back to shop" />
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

// Order placed (confirmation). Shown only when the server confirmed the order; the method is the one the customer chose.
export const PaymentSuccessScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const address = useDeliveryAddress();

  // Fail closed: success is shown only when the server confirmed this order and returned its id.
  if (params.confirmed !== true || !params.orderId) return <NoResult />;

  const orderId = params.orderId;
  const method = parsePayMethod(params.method);
  const paidOnline = method === 'online';

  return (
    <main className="commerce-screen commerce-result is-success">
      <ResultHeader onBack={() => navigate('home')} backLabel="Back to shop" right={<span className="commerce-chip-static">Order placed</span>} />

      <div className="commerce-body commerce-result-body">
        <div className="commerce-result-status">
          <span className="commerce-result-icon is-success">
            <CheckCircle2 size={34} />
          </span>
          <h1>Order placed</h1>
          <p>{paidOnline ? 'Payment received. Your order is placed and the GlowVai team will confirm it shortly.' : 'Keep the amount ready. You pay when the order arrives.'}</p>

          <dl className="commerce-result-meta">
            <div>
              <dt>Order no.</dt>
              <dd>{orderId}</dd>
            </div>
            {typeof params.amount === 'number' && (
              <div>
                <dt>{paidOnline ? 'Amount paid' : 'Amount to pay on delivery'}</dt>
                <dd>₹{params.amount}</dd>
              </div>
            )}
            {method && (
              <div>
                <dt>Payment</dt>
                <dd>{PAY_METHOD_LABEL[method]}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="commerce-result-actions">
          {address && (
            <section className="commerce-card commerce-arrival">
              <b>Delivering to</b>
              <p>
                <MapPin size={13} /> {formatAddressForDisplay(address.fullAddress)}
              </p>
            </section>
          )}
          <p className="commerce-notice">My orders shows the latest status from the GlowVai team. You can cancel there until the order is being prepared.</p>
          <button className="commerce-primary" onClick={() => navigate('orders-detail', { orderId })}>
            View order
          </button>
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Continue shopping
          </button>
        </div>
      </div>
    </main>
  );
};

// Order not placed. Back goes to the payment step; the bag is unchanged so the customer can try again.
export const PaymentFailedScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const method = parsePayMethod(params.method);

  if (!params.error && !params.orderId) return <NoResult />;

  return (
    <main className="commerce-screen commerce-result is-failed">
      <ResultHeader
        onBack={() => navigate('checkout-payment-method')}
        backLabel="Back to payment"
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
          <h1>Order not placed</h1>
          <p>{params.error || 'We could not place this order.'} Your cart is unchanged, so you can try again.</p>

          <dl className="commerce-result-meta">
            {typeof params.amount === 'number' && (
              <div>
                <dt>Amount</dt>
                <dd>₹{params.amount}</dd>
              </div>
            )}
            {method && (
              <div>
                <dt>Payment</dt>
                <dd>{PAY_METHOD_LABEL[method]}</dd>
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
