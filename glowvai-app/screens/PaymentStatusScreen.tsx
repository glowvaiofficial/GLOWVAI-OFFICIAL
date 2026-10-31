import React from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CreditCard, RotateCcw, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PaymentStatusScreen: React.FC = () => {
  const { navigate, activeParams } = useApp();
  const status = activeParams?.status === 'failed' ? 'failed' : 'cancelled';
  const failed = status === 'failed';
  return <main className={`payment-status-screen is-${status}`}>
    <header><button onClick={() => navigate('checkout', activeParams?.checkoutParams)} aria-label="Back to checkout"><ArrowLeft size={21} /></button><h1>Payment update</h1></header>
    <section>
      <div className="payment-state-mark">{failed ? <AlertTriangle size={34} /> : <X size={34} />}</div>
      <p className="payment-state-kicker">{failed ? 'PAYMENT NOT COMPLETED' : 'PAYMENT CANCELLED'}</p>
      <h2>{failed ? 'Your payment did not go through.' : 'No payment was made.'}</h2>
      <p>{failed ? 'The bank or payment app declined this attempt. If money was debited, it will be refunded by your bank or Razorpay within their usual timeline.' : 'Your bag and delivery slot are still saved. Pick another method when you are ready.'}</p>
      <div className="payment-state-receipt"><span><ShoppingBag size={17} /> Bag total</span><b>₹{activeParams?.amount || 0}</b></div>
      <button className="payment-primary" onClick={() => navigate('checkout', activeParams?.checkoutParams)}><RotateCcw size={18} /> Try another method</button>
      <button className="payment-secondary" onClick={() => navigate('home')}><CreditCard size={18} /> Continue shopping <ArrowRight size={17} /></button>
    </section>
  </main>;
};
