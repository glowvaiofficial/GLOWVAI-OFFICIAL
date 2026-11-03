import React from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, MapPin, PackageCheck, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../features/commerce/commerce.css';
import '../responsive/commerce-ported.css';

export const OrderConfirmationScreen: React.FC = () => {
  const { navigate, activeOrder, showToast } = useApp();
  if (!activeOrder) return (
    <main className="commerce-screen">
      <div className="commerce-body">
        <section className="commerce-empty-state is-card">
          <span className="commerce-empty-icon"><ShoppingBag size={26} /></span>
          <h2>No active order</h2>
          <p>Place an order to see its confirmation and delivery progress.</p>
          <button className="commerce-primary" onClick={() => navigate('home')}>Continue shopping</button>
        </section>
      </div>
    </main>
  );

  const order = activeOrder;
  const paid = order.paymentStatus === 'successful';
  const copyOrderId = async () => {
    try { await navigator.clipboard?.writeText(order.id); } catch { /* clipboard can be unavailable in preview */ }
    showToast('Order ID copied');
  };
  const stages = [
    { label: 'Confirmed', note: order.createdAt, state: 'done' },
    { label: 'Packed', note: 'Next', state: 'current' },
    { label: 'Out for delivery', note: `${order.estimatedDeliveryMinutes} min`, state: 'upcoming' },
    { label: 'Delivered', note: 'Doorstep', state: 'upcoming' },
  ];

  return (
    <main className="commerce-screen commerce-result is-success commerce-order-placed">
      <div className="commerce-body commerce-result-body">
        <div className="commerce-result-status">
          <span className="commerce-result-icon is-success"><Check size={32} strokeWidth={3} /></span>
          <h1>Order placed!</h1>
          <p>We’ve received your order and will update you as it moves.</p>
          <button className="commerce-order-id" onClick={copyOrderId}>Order ID #{order.id} <Copy size={15} /></button>
          <ol className="commerce-stage-track" aria-label="Order progress">
            {stages.map((stage, index) => <li key={stage.label} className={`is-${stage.state}`}><span>{stage.state === 'done' ? <Check size={14} /> : index + 1}</span><b>{stage.label}</b><small>{stage.note}</small></li>)}
          </ol>
        </div>

        <div className="commerce-result-actions">
          <section className="commerce-card commerce-address-body">
            <MapPin size={18} />
            <div><small>Deliver to</small><b>{order.address.street}, {order.address.area}</b><p>{order.address.city} · {order.address.pincode}</p></div>
          </section>

          <section className="commerce-card commerce-review">
            <div className="commerce-card-head"><h2>Order summary</h2><span className="commerce-muted">{order.items.length} items</span></div>
            {order.items.map((item) => <div className="commerce-review-line" key={`${item.productId}-${item.variantSize}`}><span className="commerce-thumb"><img src={item.imageUrl} alt="" /></span><div><h3>{item.productName}</h3><p>{item.variantSize} · Qty {item.quantity}</p></div><b className="commerce-review-price">₹{item.unitPrice * item.quantity}</b></div>)}
          </section>

          <section className="commerce-card commerce-order-total"><div>{paid ? <CheckCircle2 size={20} /> : <PackageCheck size={20} />}<p><small>Payment status</small><b>{paid ? 'Paid' : 'Pay on delivery'}</b></p></div><strong>₹{order.finalPayable}</strong></section>

          <button className="commerce-primary" onClick={() => navigate('order-tracking', { orderId: order.id })}>Track order <ArrowRight size={19} /></button>
          <button className="commerce-ghost" onClick={() => navigate('home')}>Continue shopping</button>
        </div>
      </div>
    </main>
  );
};
