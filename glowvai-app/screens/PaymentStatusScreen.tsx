import React from 'react';
import { AlertTriangle, ArrowRight, CreditCard, RotateCcw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FlowHeader } from '../features/commerce/components/shared';
import '../features/commerce/commerce.css';
import '../responsive/commerce-ported.css';

export const PaymentStatusScreen: React.FC = () => {
  const { navigate, activeParams } = useApp();
  const status = activeParams?.status === 'failed' ? 'failed' : 'cancelled';
  const failed = status === 'failed';
  return <main className={`commerce-screen commerce-result is-${status}`}>
    <FlowHeader title="Payment update" onBack={() => navigate('checkout', activeParams?.checkoutParams)} />
    <div className="commerce-body commerce-result-body">
      <div className="commerce-result-status">
        <span className="commerce-result-icon is-failed">{failed ? <AlertTriangle size={32} /> : <X size={32} />}</span>
        <p className="commerce-kicker">{failed ? 'Payment not completed' : 'Payment cancelled'}</p>
        <h1>{failed ? 'Your payment did not go through.' : 'No payment was made.'}</h1>
        <p>{failed ? 'The bank or payment app declined this attempt. If money was debited, it will be refunded by your bank or Razorpay within their usual timeline.' : 'Your cart is still saved. Pick another method when you are ready.'}</p>
        {typeof activeParams?.amount === 'number' && <dl className="commerce-result-meta"><div><dt>Bag total</dt><dd>₹{activeParams.amount}</dd></div></dl>}
      </div>
      <div className="commerce-result-actions">
        <button className="commerce-primary" onClick={() => navigate('checkout', activeParams?.checkoutParams)}><RotateCcw size={18} /> Try another method</button>
        <button className="commerce-ghost" onClick={() => navigate('home')}><CreditCard size={18} /> Continue shopping <ArrowRight size={17} /></button>
      </div>
    </div>
  </main>;
};
