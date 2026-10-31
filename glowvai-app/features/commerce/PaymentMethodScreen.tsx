import React from 'react';
import { Banknote, CreditCard, ShieldCheck, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { PAY_CHOICES, useCheckoutSession, type PayChoice } from './lib/checkoutSession';
import { CheckoutSteps, FlowHeader } from './components/shared';

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
  const totals = computeCartTotals(Object.values(items), couponApplied);

  const select = (id: PayChoice) => {
    safeHapticSelection();
    setPayChoice(id);
  };

  return (
    <main className="commerce-screen commerce-payment">
      <FlowHeader title="Choose payment" onBack={goBack} />
      <CheckoutSteps step={3} />

      <div className="commerce-body">
        <section className="commerce-amount-card">
          <span>Order total</span>
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
          Payments are processed through Razorpay.
        </p>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Payable amount</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button
          className="commerce-primary"
          onClick={() => {
            safeHapticImpact();
            navigate('checkout-payment-processing', { method: payChoice });
          }}
        >
          Pay ₹{totals.grandTotal}
        </button>
      </footer>
    </main>
  );
};
