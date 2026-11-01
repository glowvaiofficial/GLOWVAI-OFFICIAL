import React from 'react';
import { Banknote, CreditCard, ShieldCheck, ShoppingBag, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { PAY_CHOICES, useCheckoutSession, type PayChoice } from './lib/checkoutSession';
import { CheckoutSteps, FlowHeader, useDeliveryAddress } from './components/shared';

const GROUP_META = {
  upi: { title: 'UPI apps', icon: Smartphone },
  card: { title: 'Cards', icon: CreditCard },
  cod: { title: 'Pay on delivery', icon: Banknote },
} as const;

export const PaymentMethodScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const items = useCartStore((s) => s.items);
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const payChoice = useCheckoutSession((s) => s.payChoice);
  const setPayChoice = useCheckoutSession((s) => s.setPayChoice);
  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponApplied);
  const address = useDeliveryAddress();

  const select = (id: PayChoice) => {
    safeHapticSelection();
    setPayChoice(id);
  };

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-payment">
        <FlowHeader title="Choose payment" onBack={goBack} />
        <div className="commerce-empty-state">
          <span className="commerce-empty-icon">
            <ShoppingBag size={34} />
          </span>
          <h2>Your cart is empty</h2>
          <p>Add a product before you choose how to pay.</p>
          <button className="commerce-primary" onClick={() => navigate('home')}>
            Start shopping
          </button>
        </div>
      </main>
    );
  }

  const isCod = payChoice === 'cod';

  return (
    <main className="commerce-screen commerce-payment">
      <FlowHeader title="Choose payment" onBack={goBack} />
      <CheckoutSteps step={3} />

      <div className="commerce-body">
        <section className="commerce-card commerce-amount-card">
          <div>
            <span>Order total</span>
            <small>
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} · to {address.label}, {address.pincode || '—'}
            </small>
          </div>
          <b>₹{totals.grandTotal}</b>
        </section>

        {(Object.keys(GROUP_META) as Array<keyof typeof GROUP_META>).map((group) => {
          const Icon = GROUP_META[group].icon;
          const options = PAY_CHOICES.filter((c) => c.group === group);
          return (
            <section className="commerce-card commerce-pay-group" key={group}>
              <h2>
                <Icon size={15} /> {GROUP_META[group].title}
              </h2>
              {options.map((option) => (
                <label className={option.id === payChoice ? 'commerce-pay-option is-selected' : 'commerce-pay-option'} key={option.id}>
                  <input type="radio" name="pay-choice" checked={option.id === payChoice} onChange={() => select(option.id)} />
                  <span>
                    <b>{option.label}</b>
                    <small>{option.sub}</small>
                  </span>
                </label>
              ))}
            </section>
          );
        })}

        <p className="commerce-secure-note">
          <ShieldCheck size={16} />
          {address.serviceable ? 'Online payments are processed through Razorpay.' : 'This address is outside our delivery area. Change it on the review step to continue.'}
        </p>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>{isCod ? 'Pay on delivery' : 'Payable amount'}</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button
          className="commerce-primary"
          disabled={!address.serviceable}
          onClick={() => {
            safeHapticImpact();
            navigate('checkout-payment-processing', { method: payChoice });
          }}
        >
          {isCod ? 'Place order' : `Pay ₹${totals.grandTotal}`}
        </button>
      </footer>
    </main>
  );
};
