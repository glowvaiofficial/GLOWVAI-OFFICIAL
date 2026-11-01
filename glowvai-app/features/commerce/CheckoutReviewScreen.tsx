import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals, COUPON_CODE } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { BillRows, CheckoutSteps, DeliveryAddressCard, FlowHeader, useDeliveryAddress, useDeliveryMinutes } from './components/shared';

export const CheckoutReviewScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const items = useCartStore((s) => s.items);
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const address = useDeliveryAddress();
  const minutes = useDeliveryMinutes();

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
      <FlowHeader title="Review order" subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'} · ₹${totals.grandTotal}`} onBack={goBack} />
      <CheckoutSteps step={2} />

      <div className="commerce-body commerce-split">
        <div className="commerce-col">
          {minutes ? (
            <section className="commerce-card commerce-eta-card">
              <span className="commerce-eta-icon">
                <Zap size={16} fill="currentColor" />
              </span>
              <div>
                <b>Arriving in about {minutes} minutes</b>
                <p>Express delivery to your {address.label.toLowerCase()} address</p>
              </div>
            </section>
          ) : address.fullAddress ? (
            <section className="commerce-card commerce-warn-card" role="alert">
              <AlertTriangle size={18} />
              <div>
                <b>We don’t deliver to this address yet</b>
                <p>Choose an address with a Vijayawada pincode (520xxx) to place the order.</p>
              </div>
            </section>
          ) : null}

          <DeliveryAddressCard address={address} onChange={() => navigate('address-saved')} />

          <section className="commerce-card" aria-label="Items">
            <div className="commerce-card-head">
              <h2>
                {cartItems.length} {cartItems.length === 1 ? 'product' : 'products'}
              </h2>
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
                  <p>Qty {item.quantity}</p>
                </div>
                <b className="commerce-review-price">₹{item.price * item.quantity}</b>
              </div>
            ))}
          </section>
        </div>

        <aside className="commerce-col commerce-side" aria-label="Bill details">
          <section className="commerce-card commerce-bill">
            <h2>Bill details</h2>
            <BillRows
              rows={[
                { label: 'Item total', value: totals.itemTotal },
                totals.catalogSavings > 0 && { label: 'Product discount', value: totals.catalogSavings, saving: true },
                couponApplied && totals.couponDiscount > 0 && { label: `Coupon (${COUPON_CODE})`, value: totals.couponDiscount, saving: true },
                { label: 'Delivery', value: totals.deliveryFee, free: totals.deliveryFee === 0 },
              ]}
              totalLabel="Grand total"
              total={totals.grandTotal}
            />
            <p className="commerce-assure">
              <ShieldCheck size={14} /> You choose how to pay in the next step
            </p>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Grand total</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button
          className="commerce-primary"
          disabled={!address.serviceable}
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
