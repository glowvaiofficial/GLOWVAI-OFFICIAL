import React from 'react';
import { Banknote, MapPin, ShieldCheck, ShoppingBag, Smartphone, UserRound } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { BillRows, CheckoutSteps, FlowHeader, useDeliveryAddress } from './components/shared';

// Cash on delivery is the only way to pay for now. Online methods are listed as coming soon and cannot be chosen.
export const PaymentMethodScreen: React.FC = () => {
  const { goBack, navigate, customerDetails } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const address = useDeliveryAddress();
  const addressConfirmed = useCheckoutSession((s) => s.addressConfirmed);
  const payMethod = useCheckoutSession((s) => s.payMethod);
  const setPayMethod = useCheckoutSession((s) => s.setPayMethod);
  const tip = useCheckoutSession((s) => s.tip);
  const setTip = useCheckoutSession((s) => s.setTip);
  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress);

  // Payment needs a cart and a deliverable address; otherwise send the customer back to the step that is missing.
  // The address must be confirmed on the review step first, so the customer always sees where the order goes.
  if (cartItems.length > 0 && address?.serviceable && !addressConfirmed) {
    return (
      <main className="commerce-screen commerce-payment is-empty">
        <FlowHeader title="Confirm delivery address" onBack={goBack} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon"><MapPin size={34} /></span>
            <h2>Check your delivery address</h2>
            <p>Make sure the address is exact, with flat or floor and building name, before you pay.</p>
            <button className="commerce-primary" onClick={() => navigate('checkout-review')}>Review address</button>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0 || !address?.serviceable) {
    const noItems = cartItems.length === 0;
    return (
      <main className="commerce-screen commerce-payment is-empty">
        <FlowHeader title="Choose payment" onBack={goBack} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon">{noItems ? <ShoppingBag size={34} /> : <MapPin size={34} />}</span>
            <h2>{noItems ? 'Your cart is empty' : 'Add a delivery address first'}</h2>
            <p>{noItems ? 'Add a product before you pay.' : 'We need a Vijayawada address (520xxx pincode) before you can pay.'}</p>
            <button className="commerce-primary" onClick={() => navigate(noItems ? 'home' : 'checkout-review')}>
              {noItems ? 'Start shopping' : 'Back to review'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const placeOrder = () => {
    safeHapticImpact();
    // The order is linked to the customer's saved details, so ask for them first.
    if (!customerDetails) {
      navigate('login', { returnTo: 'checkout-payment-method', name: address.recipientName, phone: address.phoneNumber });
      return;
    }
    navigate('checkout-payment-processing', { method: payMethod });
  };
  const payable = totals.grandTotal + tip;
  const ctaLabel = customerDetails ? (payMethod === 'online' ? `Pay ₹${payable} now` : `Place order · ₹${payable}`) : 'Add your details to continue';

  return (
    <main className="commerce-screen commerce-payment has-aside">
      <FlowHeader title="Choose payment" subtitle={`Delivering to ${address.label} · ${address.pincode}`} onBack={goBack} />
      <CheckoutSteps step={3} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          <fieldset className="commerce-card commerce-pay-group">
            <legend>
              <Banknote size={15} /> How do you want to pay?
            </legend>
            <div className="commerce-pay-options">
              <label className={`commerce-pay-option${payMethod === 'cod' ? ' is-selected' : ''}`}>
                <input type="radio" name="pay-choice" checked={payMethod === 'cod'} onChange={() => setPayMethod('cod')} />
                <span>
                  <b>Cash on delivery</b>
                  <small>Pay when the order arrives</small>
                </span>
              </label>
              <label className={`commerce-pay-option${payMethod === 'online' ? ' is-selected' : ''}`}>
                <input type="radio" name="pay-choice" checked={payMethod === 'online'} onChange={() => setPayMethod('online')} />
                <span>
                  <b>
                    <Smartphone size={14} /> Pay now: UPI, card or netbanking
                  </b>
                  <small>Secure payment by Razorpay</small>
                </span>
              </label>
            </div>
          </fieldset>

          <section className="commerce-card commerce-tip" aria-labelledby="tip-title">
            <h2 id="tip-title">Tip your delivery partner</h2>
            <p className="commerce-muted">Optional. 100% goes to the delivery partner who brings your order.</p>
            <div className="commerce-tip-options" role="radiogroup" aria-label="Tip amount">
              {[0, 10, 20, 30].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  role="radio"
                  aria-checked={tip === amount}
                  className={`commerce-chip${tip === amount ? ' is-selected' : ''}`}
                  onClick={() => setTip(amount)}
                >
                  {amount === 0 ? 'No tip' : `₹${amount}`}
                </button>
              ))}
            </div>
          </section>


          {customerDetails ? (
            <section className="commerce-card commerce-address-card">
              <div className="commerce-card-head">
                <h2>Your details</h2>
                <button className="commerce-link" onClick={() => navigate('login', { returnTo: 'checkout-payment-method' })}>
                  Edit
                </button>
              </div>
              <div className="commerce-address-body">
                <UserRound size={18} />
                <div>
                  <b>{customerDetails.fullName}</b>
                  <p>+91 {customerDetails.phoneNumber}</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="commerce-aside">
          <section className="commerce-card commerce-bill" aria-labelledby="pay-bill-title">
            <h2 id="pay-bill-title">Order total</h2>
            <BillRows totals={totals} totalLabel={payMethod === 'online' ? 'Total to pay now' : 'Pay on delivery'} />
            {tip > 0 ? (
              <div className="commerce-bill-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tip for your delivery partner</span>
                <b>₹{tip}</b>
              </div>
            ) : null}
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={placeOrder}>
              {ctaLabel}
            </button>
            <p className="commerce-secure-note">
              <ShieldCheck size={16} />
              You pay the delivery partner when the order arrives. GlowVai confirms the final price when the order is placed.
            </p>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>{payMethod === 'online' ? 'Pay now' : 'Pay on delivery'}</small>
          <b>₹{payable}</b>
        </div>
        <button className="commerce-primary" onClick={placeOrder}>
          {customerDetails ? 'Place order' : 'Add your details'}
        </button>
      </footer>
    </main>
  );
};
