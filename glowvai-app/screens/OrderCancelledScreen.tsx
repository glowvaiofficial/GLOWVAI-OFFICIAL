import React from 'react';
import { ArrowRight, ReceiptText, RotateCcw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../features/commerce/commerce.css';
import '../responsive/commerce-ported.css';

export const OrderCancelledScreen: React.FC = () => {
  const { activeOrder, navigate } = useApp();
  const refunding = activeOrder?.paymentStatus === 'processing';
  if (!activeOrder || activeOrder.status !== 'cancelled') return <main className="commerce-screen"><div className="commerce-body"><section className="commerce-empty-state is-card"><span className="commerce-empty-icon"><ReceiptText size={26} /></span><h2>No cancelled order to show</h2><p>Your orders list shows every order and its status.</p><button className="commerce-primary" onClick={() => navigate('order-history')}>View all orders</button></section></div></main>;
  return <main className="commerce-screen commerce-result is-cancelled">
    <div className="commerce-body commerce-result-body">
      <div className="commerce-result-status">
        <span className="commerce-result-icon is-failed"><X size={30} /></span>
        <p className="commerce-kicker">Order cancelled</p>
        <h1>Your order won’t be delivered.</h1>
        <p>{refunding ? 'Your cancellation is recorded. Our team will confirm the refund to your original payment method.' : 'No payment was collected for this order.'}</p>
      </div>
      <div className="commerce-result-actions">
        <dl className="commerce-result-meta"><div><dt>Order ID</dt><dd>#{activeOrder.id}</dd></div><div><dt>{refunding ? 'Refund status' : 'Payment status'}</dt><dd>{refunding ? 'Pending review' : 'Not charged'}</dd></div></dl>
        <button className="commerce-primary" onClick={() => navigate('home')}><RotateCcw size={18} /> Shop again <ArrowRight size={18} /></button>
        <button className="commerce-link-block" onClick={() => navigate('order-history')}>View all orders</button>
      </div>
    </div>
  </main>;
};
