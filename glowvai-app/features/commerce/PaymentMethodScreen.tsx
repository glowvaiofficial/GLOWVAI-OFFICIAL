import React, { useState } from 'react';
import { Banknote, MapPin, ShieldCheck, ShoppingBag, Smartphone, UserRound } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { formatAddressForDisplay } from './lib/displayText';
import { BillRows, CheckoutSteps, FlowHeader, useDeliveryAddress } from './components/shared';

const TIP_OPTIONS = [0, 10, 20, 30];

// Step 3 of checkout: choose how to pay. Cash on delivery places the order; online payment (UPI, card, netbanking)
// goes through Razorpay on the processing screen. The bill, tip and primary button sit in the summary panel.
export const PaymentMethodScreen: React.FC = () => {
  const { navigate, customerDetails } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const address = useDeliveryAddress();
  const addressConfirmed = useCheckoutSession((s) => s.addressConfirmed);
  const payMethod = useCheckoutSession((s) => s.payMethod);
  const setPayMethod = useCheckoutSession((s) => s.setPayMethod);
  const tip = useCheckoutSession((s) => s.tip);
  const setTip = useCheckoutSession((s) => s.setTip);
  const [confirming, setConfirming] = useState(false);

  const cartItems = Object.values(items);

  // Payment needs a cart and a deliverable address; otherwise send the customer back to the step that is missing.
  if (cartItems.length === 0 || !address?.serviceable) {
    const noItems = cartItems.length === 0;
    return (
      <main className="commerce-screen commerce-payment is-empty">
        <FlowHeader title="Choose payment" onBack={() => navigate(noItems ? 'cart-tab' : 'checkout-review')} />
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

  const totals = computeCartTotals(cartItems, couponCode, address.fullAddress);
  const online = payMethod === 'online';
  const payable = totals.grandTotal + tip;
  const displayAddress = formatAddressForDisplay(address.fullAddress);

  const placeOrder = () => {
    safeHapticImpact();
    // The order is linked to the customer's saved details, so ask for them first.
    if (!customerDetails) {
      navigate('login', { returnTo: 'checkout-payment-method', name: address.recipientName, phone: address.phoneNumber });
      return;
    }
    // The address must be confirmed on the review step first, so the customer always sees where the order goes.
    if (!addressConfirmed) {
      navigate('checkout-review');
      return;
    }
    setConfirming(true);
  };

  // The customer confirmed the order in the dialog: go to the processing screen, which places it once.
  const confirmPlace = () => {
    setConfirming(false);
    useCheckoutSession.getState().setPlacement('idle');
    navigate('checkout-payment-processing', { method: payMethod });
  };

  const ctaLabel = !customerDetails
    ? 'Add your details to continue'
    : !addressConfirmed
      ? 'Confirm delivery address'
      : online
        ? `Pay ₹${payable} now`
        : `Place order · ₹${payable}`;

  return (
    <main className="commerce-screen commerce-payment has-aside">
      <FlowHeader title="Choose payment" subtitle={`Delivering to ${address.label} · ${address.pincode}`} onBack={() => navigate('checkout-review')} />
      <CheckoutSteps step={3} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          {!addressConfirmed && (
            <section className="commerce-card commerce-confirm-address" role="alert">
              <MapPin size={18} />
              <div>
                <b>Confirm your delivery address</b>
                <p>{displayAddress}</p>
              </div>
              <button className="commerce-link" onClick={() => navigate('checkout-review')}>
                Review
              </button>
            </section>
          )}

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
          <section className="commerce-card commerce-tip" aria-labelledby="tip-title">
            <h2 id="tip-title">Tip your delivery partner</h2>
            <p className="commerce-muted">Optional. 100% goes to the delivery partner who brings your order.</p>
            <div className="commerce-tip-options" role="radiogroup" aria-label="Tip amount">
              {TIP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  role="radio"
                  aria-checked={tip === amount}
                  className={`commerce-chip commerce-tip-chip${tip === amount ? ' is-selected is-on' : ''}`}
                  onClick={() => setTip(amount)}
                >
                  {amount === 0 ? 'No tip' : `₹${amount}`}
                </button>
              ))}
            </div>
          </section>

          <section className="commerce-card commerce-bill" aria-labelledby="pay-bill-title">
            <h2 id="pay-bill-title">Order summary</h2>
            <BillRows totals={totals} tip={tip} totalLabel={online ? 'Total to pay now' : 'Pay on delivery'} />
            <div className="commerce-summary-address">
              <MapPin size={14} />
              <div>
                <b>Delivering to</b>
                <p>{displayAddress}</p>
              </div>
            </div>
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={placeOrder}>
              {ctaLabel}
            </button>
            <p className="commerce-secure-note">
              <ShieldCheck size={16} />
              {online
                ? 'Payment is processed by Razorpay. The order is placed once the payment is confirmed.'
                : 'You pay the delivery partner when the order arrives. GlowVai confirms the final price when the order is placed.'}
            </p>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>{online ? 'Pay now' : 'Pay on delivery'}</small>
          <b>₹{payable}</b>
        </div>
        <button className="commerce-primary" onClick={placeOrder}>
          {!customerDetails ? 'Add your details' : !addressConfirmed ? 'Confirm address' : online ? 'Pay now' : 'Place order'}
        </button>
      </footer>

      {confirming ? (
        <div className="commerce-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-order-title">
          <div className="commerce-confirm-sheet">
            <h2 id="confirm-order-title">Confirm your order</h2>
            <p>
              {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} to {displayAddress}, {address.city} {address.pincode}
            </p>
            <p>
              {online ? 'You pay now by UPI, card or netbanking.' : 'You pay the delivery partner when the order arrives.'}
              {tip > 0 ? ` Includes a ₹${tip} tip for your delivery partner.` : ''}
            </p>
            <p className="commerce-confirm-total">Total ₹{payable}</p>
            <div className="commerce-confirm-actions">
              <button type="button" className="commerce-ghost" onClick={() => setConfirming(false)}>
                Edit order
              </button>
              <button type="button" className="commerce-primary" onClick={confirmPlace}>
                {online ? 'Confirm and pay' : 'Confirm and place'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};
