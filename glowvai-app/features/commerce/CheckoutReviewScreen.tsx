import React from 'react';
import { ArrowRight, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { BillRows, CheckoutSteps, DeliveryAddressCard, FlowHeader, useDeliveryAddress } from './components/shared';
import { CoinsRedeemCard } from './CoinsRedeemCard';

// Step 2 of checkout: the items and the delivery address. Back goes to the cart.
export const CheckoutReviewScreen: React.FC = () => {
  const { navigate } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const address = useDeliveryAddress();

  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress);
  const canContinue = Boolean(address?.serviceable);

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-review is-empty">
        <FlowHeader title="Review order" onBack={() => navigate('cart-tab')} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon">
              <ShoppingBag size={34} />
            </span>
            <h2>Your cart is empty</h2>
            <p>Add a product before you check out.</p>
            <button className="commerce-primary" onClick={() => navigate('home')}>
              Start shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  const next = () => {
    safeHapticImpact();
    if (!address) {
      navigate('location-setup', { returnTo: 'checkout-review' });
      return;
    }
    // The customer confirms the delivery address shown above before paying.
    useCheckoutSession.getState().setAddressConfirmed(true);
    navigate('checkout-payment-method');
  };
  const ctaLabel = address ? 'Confirm address and continue' : 'Add delivery address';

  return (
    <main className="commerce-screen commerce-review has-aside">
      <FlowHeader title="Review order" subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`} onBack={() => navigate('cart-tab')} />
      <CheckoutSteps step={2} />
      <CoinsRedeemCard items={cartItems} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          {address?.serviceable && (
            <section className="commerce-card commerce-eta-card">
              <span className="commerce-eta-icon">
                <Zap size={16} fill="currentColor" />
              </span>
              <div>
                <b>{address.etaMinutes ? `Delivery in about ${address.etaMinutes} minutes` : 'Fast delivery to your area'}</b>
              </div>
            </section>
          )}

          <DeliveryAddressCard address={address} onChange={() => navigate('address-saved', { returnTo: 'checkout-review' })} onAdd={() => navigate('location-setup', { returnTo: 'checkout-review' })} />

          <section className="commerce-card" aria-label="Items">
            <div className="commerce-card-head">
              <h2>Items ({totals.itemCount})</h2>
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

        <aside className="commerce-aside">
          <section className="commerce-card commerce-bill" aria-labelledby="review-bill-title">
            <h2 id="review-bill-title">Bill details</h2>
            <BillRows totals={totals} totalLabel="Grand total" />
            <p className="commerce-assure">
              <ShieldCheck size={14} /> You pay securely in the next step
            </p>
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={next} disabled={Boolean(address) && !canContinue}>
              {ctaLabel} <ArrowRight size={18} />
            </button>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Grand total</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button className="commerce-primary" onClick={next} disabled={Boolean(address) && !canContinue}>
          {ctaLabel} <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
};
