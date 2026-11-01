import React from 'react';
import { ArrowRight, Clock3, ReceiptText, RotateCcw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OrderCancelledScreen: React.FC = () => {
  const { activeOrder, navigate } = useApp();
  const refunding = activeOrder?.paymentStatus === 'processing';
  return <main className="order-cancelled-screen">
    <div className="cancelled-mark"><X size={31} /></div>
    <p className="cancelled-kicker">ORDER CANCELLED</p>
    <h1>Your order won’t be delivered.</h1>
    <p>{refunding ? 'Your cancellation is recorded. Our team will confirm the refund to your original payment method.' : 'No payment was collected for this order.'}</p>
    <section><div><ReceiptText size={18} /><span>Order ID</span><b>#{activeOrder?.id || '—'}</b></div><div><Clock3 size={18} /><span>{refunding ? 'Refund status' : 'Payment status'}</span><b>{refunding ? 'Pending review' : 'Not charged'}</b></div></section>
    <button onClick={() => navigate('home')}><RotateCcw size={18} /> Shop again <ArrowRight size={18} /></button>
    <button className="cancelled-orders-link" onClick={() => navigate('order-history')}>View all orders</button>
  </main>;
};
