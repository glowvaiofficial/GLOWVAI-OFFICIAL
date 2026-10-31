import React from 'react';
import { ArrowRight, Clock, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals, COUPON_CODE } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { CheckoutSteps, DeliveryAddressCard, FlowHeader, useDeliveryAddress } from './components/shared';

export const CheckoutReviewScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const items = useCartStore((s) => s.items);
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const address = useDeliveryAddress();

  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponApplied);

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-review">
        <FlowHeader title="Review order" onBack={goBack} />
        <div className="commerce-empty-state">
          <span className="commerce-empty-icon">
            <ShoppingBag size={34} />
          </span>
          <h2>Your cart is empty</h2>
          <p>Add a product before you check out.</p>
          <button className="commerce-primary" onClick={() => navigate('home')}>
            Start shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="commerce-screen commerce-review">
      <FlowHeader title="Review order" subtitle={`${totals.itemCount} items`} onBack={goBack} />
      <CheckoutSteps step={2} />

      <div className="commerce-body">
        <section className="commerce-card commerce-eta-card">
          <span className="commerce-eta-icon">
            <Zap size={16} fill="currentColor" />
          </span>
          <div>
            <b>Arriving in about 10 minutes</b>
            <p>Dispatched from the Glowway darkstore nearest to you</p>
          </div>
        </section>

        <DeliveryAddressCard address={address} onChange={() => navigate('address-saved')} />

        <section className="commerce-card" aria-label="Items">
          <div className="commerce-card-head">
            <h2>Items</h2>
            <button className="commerce-link" onClick={() => navigate('cart-tab')}>
              Edit cart
            </button>
          </div>
          {cartItems.map((item) => (
            <div className="commerce-review-line" key={item.productId}>
              <div className="commerce-thumb">
                {item.image ? <img src={item.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <ShoppingBag size={20} />}
              </div>
              <div>
                <small>{item.brand}</small>
                <h3>{item.name}</h3>
                <p>
                  Qty {item.quantity} · ₹{item.price * item.quantity}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="commerce-card commerce-bill">
          <h2>Bill details</h2>
          <dl>
            <div>
              <dt>Item total</dt>
              <dd>₹{totals.itemTotal}</dd>
            </div>
            <div className="is-saving">
              <dt>Catalog discount</dt>
              <dd>−₹{totals.catalogSavings}</dd>
            </div>
            {couponApplied && (
              <div className="is-saving">
                <dt>Coupon ({COUPON_CODE})</dt>
                <dd>−₹{totals.couponDiscount}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd>{totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`}</dd>
            </div>
            <div className="commerce-bill-total">
              <dt>Grand total</dt>
              <dd>₹{totals.grandTotal}</dd>
            </div>
          </dl>
          <p className="commerce-assure">
            <Clock size={14} /> Pay securely in the next step <ShieldCheck size={14} />
          </p>
        </section>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Grand total</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button
          className="commerce-primary"
          onClick={() => {
            safeHapticImpact();
            navigate('checkout-payment-method');
          }}
        >
          Continue to payment <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
};
