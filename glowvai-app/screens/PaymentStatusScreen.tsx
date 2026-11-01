import React from 'react';
import { AlertTriangle, RotateCcw, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PaymentStatusScreen: React.FC = () => {
  const { navigate, activeParams } = useApp();
  const status = activeParams?.status === 'failed' ? 'failed' : 'cancelled';
  const failed = status === 'failed';
  const amount = typeof activeParams?.amount === 'number' ? `₹${activeParams.amount}` : '—';

  return (
    <main className={`commerce-screen commerce-result is-${status}`}>
      <header className="commerce-result-head">
        <span className="commerce-brand">
          <Sparkles size={16} />
          glowvai
        </span>
        <span>Payment update</span>
      </header>

      <div className="commerce-body commerce-result-body">
        <span className={failed ? 'commerce-result-icon is-failed' : 'commerce-result-icon is-neutral'}>{failed ? <AlertTriangle size={32} /> : <X size={32} />}</span>
        <h1>{failed ? 'Your payment didn’t go through' : 'No payment was made'}</h1>
        <p>
          {failed
            ? 'The bank or payment app declined this attempt. If money left your account, your bank or Razorpay returns it within their usual refund time.'
            : 'You cancelled the payment. Your cart is still saved, so you can pick another method when you are ready.'}
        </p>

        <dl className="commerce-result-meta">
          <div>
            <dt>Status</dt>
            <dd>{failed ? 'Not completed' : 'Cancelled'}</dd>
          </div>
          <div>
            <dt>Cart total</dt>
            <dd>{amount}</dd>
          </div>
          {typeof activeParams?.message === 'string' && activeParams.message && (
            <div>
              <dt>Reason</dt>
              <dd>{activeParams.message}</dd>
            </div>
          )}
        </dl>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate('home')}>
          Continue shopping
        </button>
        <button className="commerce-primary" onClick={() => navigate('checkout', activeParams?.checkoutParams)}>
          <RotateCcw size={17} /> Try again
        </button>
      </footer>
    </main>
  );
};
