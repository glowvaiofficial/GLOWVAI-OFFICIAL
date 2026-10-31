import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Minus, PackageOpen, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/cart-tracking.css';

export const CartScreen: React.FC = () => {
  const { goBack, navigate, cart, cartItemCount, updateQuantity, toggleItemInsurance, removeFromCart, clearCart, cartAuthoritative, currentAddress, showToast } = useApp();
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const couponDiscount = couponApplied ? 50 : 0;
  const payable = Math.max(0, cartAuthoritative.finalPayable - couponDiscount);

  const applyCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    if (['GLOW50', 'FIRST'].includes(couponCode.trim().toUpperCase())) {
      setCouponApplied(true);
      setCouponCode('GLOW50');
      showToast('GLOW50 applied — ₹50 saved');
      return;
    }
    setCouponApplied(false);
    showToast('Try GLOW50 for ₹50 off');
  };

  if (!cart.length) return (
    <main className="commerce-empty">
      <header><button onClick={goBack} aria-label="Go back"><ArrowLeft /></button><h1>Your cart</h1></header>
      <div><span><ShoppingBag size={34} /></span><h2>Your cart feels light</h2><p>Add your everyday beauty essentials and get them delivered in minutes.</p><button onClick={() => navigate('home')}>Start shopping</button></div>
    </main>
  );

  return (
    <main className="cart-screen commerce-flow-screen">
      <header className="commerce-flow-header">
        <button onClick={goBack} aria-label="Go back"><ArrowLeft size={21} /></button>
        <div><h1>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} {cartItemCount === 1 ? 'item' : 'items'})</h1><p><Zap size={12} fill="currentColor" /> {currentAddress.deliveryMinutes} min to {currentAddress.area}</p></div>
        <button className="commerce-clear" onClick={clearCart}>Clear</button>
      </header>

      <div className="commerce-flow-body">
        {cartAuthoritative.isSplitDelivery && <div className="commerce-alert"><AlertTriangle size={18} /><div><b>Two fulfilment points</b><p>{cartAuthoritative.sourcingNotice}</p></div></div>}

        <section className="cart-items" aria-label="Items in cart">
          {cart.map((item) => {
            const variant = item.product.variants.find((entry) => entry.id === item.variantId) || item.product.variants[0];
            return <article className="cart-item" key={item.id}>
              <div className="cart-item-main">
                <div className="cart-item-image"><PackageOpen className="cart-item-fallback" /><img src={item.product.images[0]} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
                <div className="cart-item-copy"><small>{item.product.brand}</small><h2>{item.product.name}</h2><p>{variant.size} · ₹{variant.price} each</p><button onClick={() => removeFromCart(item.id)}><Trash2 size={13} /> Remove</button></div>
                <div className="cart-quantity"><button onClick={() => updateQuantity(item.id, -1)} aria-label={`Remove one ${item.product.name}`}><Minus size={14} /></button><b>{item.quantity}</b><button onClick={() => updateQuantity(item.id, 1)} aria-label={`Add one ${item.product.name}`}><Plus size={14} /></button></div>
              </div>
              {item.product.insuranceEligible && <label className={`cart-insurance${item.withInsurance ? ' is-selected' : ''}`}><input type="checkbox" checked={item.withInsurance} onChange={() => toggleItemInsurance(item.id)} /><ShieldCheck size={16} /><span>14-day suitability cover</span><b>+₹{(item.product.insuranceFee || 29) * item.quantity}</b></label>}
            </article>;
          })}
        </section>

        <section className="cart-coupon">
          <form onSubmit={applyCoupon}><Tag size={18} /><input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" aria-label="Coupon code" /><button type="submit">Apply</button></form>
          {couponApplied && <p>GLOW50 applied · You saved ₹50</p>}
        </section>

        <section className="bill-card" aria-labelledby="cart-bill-title">
          <h2 id="cart-bill-title">Bill details</h2>
          <dl><div><dt>Item total</dt><dd>₹{cartAuthoritative.itemSubtotal}</dd></div><div className="is-saving"><dt>Product savings</dt><dd>−₹{cartAuthoritative.discountTotal}</dd></div>{couponDiscount > 0 && <div className="is-saving"><dt>Coupon</dt><dd>−₹{couponDiscount}</dd></div>}{cartAuthoritative.insuranceTotal > 0 && <div><dt>Suitability cover</dt><dd>+₹{cartAuthoritative.insuranceTotal}</dd></div>}<div><dt>Delivery</dt><dd>{cartAuthoritative.deliveryFee ? `₹${cartAuthoritative.deliveryFee}` : 'FREE'}</dd></div><div className="bill-total"><dt>To pay</dt><dd>₹{payable}</dd></div></dl>
        </section>
      </div>

      <footer className="commerce-sticky-action"><div><small>Total payable</small><b>₹{payable}</b></div><button onClick={() => navigate('checkout', { finalPayable: payable, couponDiscount, couponCode: couponApplied ? 'GLOW50' : undefined })}>Checkout <ArrowRight size={18} /></button></footer>
    </main>
  );
};
