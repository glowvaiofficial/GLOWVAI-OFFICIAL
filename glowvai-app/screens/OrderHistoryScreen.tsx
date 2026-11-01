import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, PackageOpen, Repeat, Star, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { PRODUCTS } from '../data/products';

export const OrderHistoryScreen: React.FC = () => {
  const { goBack, navigate, orders, addToCart, showToast, setActiveOrder } = useApp();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [stars, setStars] = useState(5);

  const reorder = (order: Order) => {
    order.items.forEach((item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.productId);
      if (!product) return;
      // Reorder the same size or shade the customer bought, falling back to the current variant only if it no longer exists.
      const variant = product.variants.find((entry) => entry.size === item.variantSize) ?? product.variants.find((entry) => entry.id === product.currentVariantId);
      if (variant) addToCart(product, variant.id, item.insuranceSelected);
    });
    showToast('Items added to your bag');
    navigate('cart');
  };
  const openOrder = (order: Order) => {
    setActiveOrder(order);
    navigate(order.status === 'cancelled' ? 'order-cancelled' : 'order-tracking', { orderId: order.id });
  };

  return <main className="orders-v3">
    <header className="commerce-flow-header"><button onClick={goBack} aria-label="Go back"><ArrowLeft size={21} /></button><div><h1>Your orders</h1><p>Track, reorder or get help</p></div></header>
    {!orders.length ? <section className="orders-empty"><span><PackageOpen size={30} /></span><h2>No orders yet</h2><p>Your placed and cancelled orders will stay here.</p><button onClick={() => navigate('home')}>Explore beauty essentials <ArrowRight size={17} /></button></section> : <div className="orders-list">
      {orders.map((order) => {
        const delivered = order.status === 'delivered';
        const cancelled = order.status === 'cancelled';
        return <article className="order-history-card" key={order.id}>
          <header><span className={cancelled ? 'is-cancelled' : delivered ? 'is-delivered' : 'is-active'}>{cancelled ? <XCircle size={15} /> : delivered ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{order.status.replace(/_/g, ' ')}</span><time>{order.createdAt}</time></header>
          <div className="order-history-products" style={{ gridTemplateColumns: '46px minmax(0,1fr) auto', gap: 9 }}>{order.items[0] && <img src={order.items[0].imageUrl} alt="" />}<p style={{ marginLeft: 0 }}><b>{order.items[0]?.productName}</b><small>{order.items.length} item{order.items.length === 1 ? '' : 's'} · #{order.id}</small></p><strong>₹{order.finalPayable}</strong></div>
          <footer>{delivered ? <><button onClick={() => reorder(order)}><Repeat size={15} /> Reorder</button><button onClick={() => setReviewOrder(order)}><Star size={15} /> Rate</button></> : <button className="order-history-primary" onClick={() => openOrder(order)}>{cancelled ? 'View cancellation' : 'Track order'} <ArrowRight size={16} /></button>}</footer>
        </article>;
      })}
    </div>}
    {reviewOrder && <div className="order-review-backdrop"><form onSubmit={(event) => { event.preventDefault(); setReviewOrder(null); showToast('Thanks for your feedback'); }}><h2>How was your order?</h2><p>Order #{reviewOrder.id}</p><div>{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} onClick={() => setStars(value)}><Star size={25} fill={value <= stars ? 'currentColor' : 'none'} /></button>)}</div><textarea aria-label="Review note" placeholder="Anything we should know? (optional)" /><button type="submit">Submit review</button><button type="button" className="review-later" onClick={() => setReviewOrder(null)}>Maybe later</button></form></div>}
  </main>;
};
