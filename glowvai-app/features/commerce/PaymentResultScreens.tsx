import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Banknote, Bike, Check, Clock, CreditCard, ExternalLink, HelpCircle, ReceiptText, RefreshCw, ShoppingBag, Store } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { fetchOrderTracking } from '../../core/services/shopTracking';
import { confirmCheckDelay, confirmingView, type ConfirmStep } from '../orders/orderProgress';
import { useDeliveryAddress } from './components/shared';
import { PAY_METHOD_LABEL, parsePayMethod } from './lib/paymentMethod';
import { formatAddressForDisplay } from './lib/displayText';
import { PremiumHeader, Wordmark, rupee } from './components/premium';

interface PaymentResultParams {
  orderId?: string;
  amount?: number;
  method?: string;
  confirmed?: boolean;
  error?: string;
}

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// Orders this tab already moved on to live tracking. Back from tracking then stays on this screen instead of jumping
// forward again.
const forwarded = new Set<string>();

// Shown when a result screen is opened without a payment that this session just confirmed or attempted.
const NoResult: React.FC = () => {
  const { navigate } = useApp();
  return (
    <main className="commerce-screen gvp gvp-result is-none">
      <PremiumHeader brand title="No recent payment" onBack={() => navigate('home')} backLabel="Back to shop" />
      <div className="commerce-body gvp-body gvp-result-body">
        <div className="gvp-card gvp-empty">
          <span className="gvp-empty-icon" aria-hidden="true">
            <ReceiptText size={30} />
          </span>
          <h2>No recent payment</h2>
          <p>There is no order being paid for right now. Your orders list shows every order you have placed.</p>
          <button type="button" className="gvp-btn" onClick={() => navigate('orders-list')}>
            View my orders
          </button>
          <button type="button" className="gvp-link" onClick={() => navigate('home')}>
            Continue shopping
          </button>
        </div>
      </div>
    </main>
  );
};

const STEP_ICON = { payment: Store, store: ShoppingBag, rider: Bike } as const;

// The store, the bag and the rider, joined by a dashed road; each lights up as its step is done.
const ConfirmArt: React.FC<{ steps: ConfirmStep[]; cancelled: boolean }> = ({ steps, cancelled }) => (
  <div className={`gvp-confirm-art${cancelled ? ' is-cancelled' : ''}`} aria-hidden="true">
    {steps.map((step) => {
      const Icon = STEP_ICON[step.key];
      return (
        <span key={step.key} className={`gvp-confirm-art-item is-${step.state} is-${step.key}`}>
          <span className="gvp-confirm-art-icon">
            <Icon size={step.key === 'store' ? 44 : 34} strokeWidth={1.6} />
          </span>
          <span className="gvp-confirm-art-dot">{step.state === 'done' && <Check size={16} strokeWidth={3} />}</span>
        </span>
      );
    })}
  </div>
);

const Stepper: React.FC<{ steps: ConfirmStep[] }> = ({ steps }) => (
  <ol className="gvp-confirm-steps" aria-label="Order confirmation progress">
    {steps.map((step) => (
      <li key={step.key} className={`is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
        <span className="gvp-confirm-dot" aria-hidden="true">
          {step.state === 'done' && <Check size={18} strokeWidth={3} />}
        </span>
        <span className="gvp-confirm-label">{step.label}</span>
        <span className="gvp-sr">, {step.state === 'done' ? 'done' : step.state === 'current' ? 'in progress' : 'not yet'}</span>
      </li>
    ))}
  </ol>
);

// After the order is placed: "Confirming your order". Shown only when the server confirmed the order and returned its id.
// The order's status is read from the server (GET /api/shop/orders/{id}) when the screen opens and then now and again
// while the tab is visible (10 s, slowing to 30 s, at most ten times); "Check now" asks at once. Once the store accepts,
// the screen moves on to live tracking (once per order).
export const PaymentSuccessScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const address = useDeliveryAddress();
  const orderId = params.confirmed === true && params.orderId ? params.orderId : null;
  const method = parsePayMethod(params.method);
  const paidOnline = method === 'online';

  const [status, setStatus] = useState<string | null>(null);
  const [riderAssigned, setRiderAssigned] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  // Bumped after every check (and while the tab is hidden), so the next re-check is scheduled even when nothing changed.
  const [tick, setTick] = useState(0);
  const attempts = useRef(0);

  const check = useCallback(async () => {
    if (!orderId) return;
    setChecking(true);
    const res = await fetchOrderTracking(orderId);
    setChecking(false);
    if (res.ok && res.data?.tracking) {
      setStatus(res.data.tracking.status || 'PLACED');
      setRiderAssigned(Boolean(res.data.tracking.rider?.name));
      setCheckFailed(false);
    } else {
      setCheckFailed(true);
    }
    setTick((n) => n + 1);
  }, [orderId]);

  const view = confirmingView({ status, paidOnline, riderAssigned });

  // First check at once, then a few spaced re-checks while the tab is visible and the store has not answered.
  useEffect(() => {
    if (!orderId) return;
    void check();
  }, [orderId, check]);
  useEffect(() => {
    if (!orderId || view.readyForTracking || view.phase === 'cancelled') return;
    const delay = confirmCheckDelay(attempts.current);
    if (delay === null) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        attempts.current += 1;
        void check();
      } else {
        // No request while the tab is hidden; look again after the same wait.
        setTick((n) => n + 1);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [orderId, view.readyForTracking, view.phase, tick, check]);

  // Accepted: show the finished step for a moment, then open live tracking (once per order).
  const autoForward = Boolean(orderId) && view.readyForTracking && !forwarded.has(orderId ?? '');
  useEffect(() => {
    if (!autoForward || !orderId) return;
    const t = window.setTimeout(() => {
      forwarded.add(orderId);
      navigate('orders-tracking', { orderId });
    }, reducedMotion() ? 500 : 1400);
    return () => window.clearTimeout(t);
  }, [autoForward, orderId, navigate]);

  // Fail closed: success is shown only when the server confirmed this order and returned its id.
  if (!orderId) return <NoResult />;

  const cancelled = view.phase === 'cancelled';
  const hint = cancelled
    ? null
    : view.readyForTracking
      ? autoForward
        ? 'Opening live tracking…'
        : 'The store has your order. Live tracking is ready.'
      : checking
        ? 'Checking with the store…'
        : 'This page updates by itself while it is open.';

  return (
    <main className="commerce-screen gvp gvp-result gvp-confirming">
      <div className="gvp-confirm-top">
        <button type="button" className="gvp-link" onClick={() => navigate('home')}>
          Close
        </button>
        <Wordmark />
        <span className="gvp-confirm-top-spacer" />
      </div>

      <div className="commerce-body gvp-confirm-body">
        <section className="gvp-confirm-main" aria-live="polite">
          <ConfirmArt steps={view.steps} cancelled={cancelled} />
          <h1 key={view.title} className="gvp-confirm-title">
            {view.title}
          </h1>
          <p className="gvp-confirm-sub">{view.subtitle}</p>
          <Stepper steps={view.steps} />
          {hint && (
            <p className="gvp-confirm-hint">
              <Clock size={16} aria-hidden="true" /> {hint}
            </p>
          )}
          {checkFailed && !view.readyForTracking && <p className="gvp-confirm-warn">We could not check the latest status. Try again in a moment.</p>}
          <div className="gvp-confirm-actions">
            {view.readyForTracking ? (
              <button type="button" className="gvp-btn" onClick={() => navigate('orders-tracking', { orderId })}>
                Track order <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : !cancelled ? (
              <button type="button" className="gvp-btn is-soft" onClick={() => void check()} disabled={checking}>
                <RefreshCw size={16} aria-hidden="true" /> {checking ? 'Checking…' : 'Check now'}
              </button>
            ) : null}
          </div>
        </section>

        <aside className="gvp-confirm-side">
          <dl className="gvp-card gvp-confirm-meta">
            <div>
              <dt>Order ID</dt>
              <dd>{orderId}</dd>
            </div>
            {typeof params.amount === 'number' && params.amount > 0 && (
              <div>
                <dt>{paidOnline ? 'Paid' : 'Total to pay on delivery'}</dt>
                <dd className="is-total">{rupee(params.amount)}</dd>
              </div>
            )}
            {method && (
              <div>
                <dt>Payment</dt>
                <dd>{PAY_METHOD_LABEL[method]}</dd>
              </div>
            )}
            {address && (
              <div>
                <dt>Delivering to</dt>
                <dd>{formatAddressForDisplay(address.fullAddress)}</dd>
              </div>
            )}
            <p className="gvp-confirm-paynote">
              {paidOnline ? <CreditCard size={16} aria-hidden="true" /> : <Banknote size={16} aria-hidden="true" />}
              {paidOnline ? 'Paid online. A receipt is on your order.' : 'Cash on delivery: pay the delivery partner when your order arrives.'}
            </p>
          </dl>
          <div className="gvp-confirm-links">
            <button type="button" className="gvp-btn is-ghost" onClick={() => navigate('orders-detail', { orderId })}>
              View order
            </button>
            <button type="button" className="gvp-btn is-ghost" onClick={() => navigate('home')}>
              Continue shopping
            </button>
          </div>
        </aside>
      </div>

      <footer className="gvp-confirm-support">
        <span>Having trouble?</span>
        <button type="button" className="gvp-link" onClick={() => navigate('profile-support')}>
          Get support <ExternalLink size={15} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
};

// Order not placed. Back goes to the payment step; the bag is unchanged so the customer can try again. Try again sends the
// same order attempt (the same Idempotency-Key), so it never makes a second order.
export const PaymentFailedScreen: React.FC = () => {
  const { activeParams, navigate } = useApp();
  const params = (activeParams || {}) as PaymentResultParams;
  const method = parsePayMethod(params.method);

  if (!params.error && !params.orderId) return <NoResult />;

  return (
    <main className="commerce-screen gvp gvp-result is-failed">
      <PremiumHeader
        brand
        title="Order not placed"
        onBack={() => navigate('checkout-payment-method')}
        backLabel="Back to payment"
        right={
          <button type="button" className="gvp-round" onClick={() => navigate('profile-support')} aria-label="Get help">
            <HelpCircle size={18} aria-hidden="true" />
          </button>
        }
      />

      <div className="commerce-body gvp-body gvp-result-body">
        <div className="gvp-card gvp-empty is-failed">
          <span className="gvp-empty-icon" aria-hidden="true">
            <AlertTriangle size={30} />
          </span>
          <h2>Order not placed</h2>
          <p>{params.error || 'We could not place this order.'} Your cart is unchanged, so you can try again.</p>
          {(typeof params.amount === 'number' || method) && (
            <dl className="gvp-result-meta">
              {typeof params.amount === 'number' && (
                <div>
                  <dt>Amount</dt>
                  <dd>{rupee(params.amount)}</dd>
                </div>
              )}
              {method && (
                <div>
                  <dt>Payment</dt>
                  <dd>{PAY_METHOD_LABEL[method]}</dd>
                </div>
              )}
            </dl>
          )}
          <button type="button" className="gvp-btn is-block" onClick={() => navigate('checkout-payment-method')}>
            Try again
          </button>
          <button type="button" className="gvp-btn is-ghost is-block" onClick={() => navigate('cart-tab')}>
            Back to cart
          </button>
          <button type="button" className="gvp-link" onClick={() => navigate('profile-support')}>
            Contact support
          </button>
        </div>
      </div>
    </main>
  );
};
