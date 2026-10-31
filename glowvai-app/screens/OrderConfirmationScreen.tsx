import React from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, MapPin, PackageCheck, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OrderConfirmationScreen: React.FC = () => {
  const { navigate, activeOrder, showToast } = useApp();
  if (!activeOrder) return (
    <main className="commerce-empty"><div><span><ShoppingBag size={34} /></span><h2>No active order</h2><p>Place an order to see its confirmation and delivery progress.</p><button onClick={() => navigate('home')}>Continue shopping</button></div></main>
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
    <main className="order-confirmation receipt-confirmation">
      <div className="receipt-slot" aria-hidden="true"><span /></div>
      <article className="order-receipt">
        <div className="order-check"><Check size={36} strokeWidth={3} /></div>
        <h1>Order placed!</h1>
        <p>We’ve received your order and will update you as it moves.</p>
        <button className="order-id" onClick={copyOrderId}>Order ID #{order.id} <Copy size={15} /></button>

        <div className="order-status-track" aria-label="Order progress">
          {stages.map((stage, index) => <div key={stage.label} className={`is-${stage.state}`} style={{ '--status-order': index } as React.CSSProperties}><span>{stage.state === 'done' ? <Check size={14} /> : index + 1}</span><b>{stage.label}</b><small>{stage.note}</small></div>)}
        </div>

        <section className="order-receipt-address"><MapPin size={18} /><div><small>Deliver to</small><b>{order.address.street}, {order.address.area}</b><p>{order.address.city} · {order.address.pincode}</p></div></section>

        <section className="order-receipt-items">
          <h2>Order summary <span>{order.items.length} items</span></h2>
          {order.items.map((item) => <div key={`${item.productId}-${item.variantSize}`}><img src={item.imageUrl} alt="" /><span><b>{item.productName}</b><small>{item.variantSize} · Qty {item.quantity}</small></span><strong>₹{item.unitPrice * item.quantity}</strong></div>)}
        </section>

        <section className="order-paid-summary"><div><span>{paid ? <CheckCircle2 size={18} /> : <PackageCheck size={18} />}</span><p><small>Payment status</small><b>{paid ? 'Paid' : 'Pay on delivery'}</b></p></div><strong>₹{order.finalPayable}</strong></section>

        <button className="order-track-button" onClick={() => navigate('order-tracking', { orderId: order.id })}>Track order <ArrowRight size={19} /></button>
        <button className="order-home-button" onClick={() => navigate('home')}>Continue shopping</button>
      </article>
    </main>
  );
};
