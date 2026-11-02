import React from 'react';
import { Banknote, CreditCard, MapPin, ShieldCheck, ShoppingBag, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { PAY_CHOICES, useCheckoutSession, type PayChoice } from './lib/checkoutSession';
import { BillRows, CheckoutSteps, FlowHeader, useDeliveryAddress } from './components/shared';

const GROUP_META = {
  upi: { title: 'UPI apps', icon: Smartphone },
  card: { title: 'Cards', icon: CreditCard },
  cod: { title: 'Pay on delivery', icon: Banknote },
} as const;

export const PaymentMethodScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const payChoice = useCheckoutSession((s) => s.payChoice);
  const setPayChoice = useCheckoutSession((s) => s.setPayChoice);
  const address = useDeliveryAddress();
  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress);

  const select = (id: PayChoice) => {
    safeHapticSelection();
    setPayChoice(id);
  };

  // Payment needs a cart and a deliverable address; otherwise send the customer back to the step that is missing.
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

  const isCod = payChoice === 'cod';
  const pay = () => {
    safeHapticImpact();
    navigate('checkout-payment-processing', { method: payChoice });
  };
  const ctaLabel = isCod ? `Place order · ₹${totals.grandTotal}` : `Pay ₹${totals.grandTotal}`;

  return (
    <main className="commerce-screen commerce-payment has-aside">
      <FlowHeader title="Choose payment" subtitle={`Delivering to ${address.label} · ${address.pincode}`} onBack={goBack} />
      <CheckoutSteps step={3} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          {(Object.keys(GROUP_META) as Array<keyof typeof GROUP_META>).map((group) => {
            const Icon = GROUP_META[group].icon;
            const options = PAY_CHOICES.filter((c) => c.group === group);
            return (
              <fieldset className="commerce-card commerce-pay-group" key={group}>
                <legend>
                  <Icon size={15} /> {GROUP_META[group].title}
                </legend>
                <div className="commerce-pay-options">
                  {options.map((option) => (
                    <label className={option.id === payChoice ? 'commerce-pay-option is-selected' : 'commerce-pay-option'} key={option.id}>
                      <input type="radio" name="pay-choice" checked={option.id === payChoice} onChange={() => select(option.id)} />
                      <span>
                        <b>{option.label}</b>
                        <small>{option.sub}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <aside className="commerce-aside">
          <section className="commerce-card commerce-bill" aria-labelledby="pay-bill-title">
            <h2 id="pay-bill-title">Order total</h2>
            <BillRows totals={totals} totalLabel={isCod ? 'Pay on delivery' : 'To pay now'} />
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={pay}>
              {ctaLabel}
            </button>
            <p className="commerce-secure-note">
              <ShieldCheck size={16} />
              {isCod ? 'You pay the delivery partner when the order arrives.' : 'Online payments are processed by Razorpay. The order is confirmed only after the payment is verified.'}
            </p>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>{isCod ? 'Pay on delivery' : 'Payable amount'}</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button className="commerce-primary" onClick={pay}>
          {isCod ? 'Place order' : `Pay ₹${totals.grandTotal}`}
        </button>
      </footer>
    </main>
  );
};
