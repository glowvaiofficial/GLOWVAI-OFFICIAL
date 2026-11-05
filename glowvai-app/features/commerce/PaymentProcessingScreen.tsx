import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { useCustomerStore } from '../../core/state/customerStore';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { placeCartOrder } from './lib/orderPlacement';
import { useCustomer, useDeliveryAddress } from './components/shared';

const MIN_DISPLAY_MS = 1200;
// One request does all of this on the server; the list is marked done only when the server has answered.
const STEPS = ['Checking prices and availability', 'Saving your cash-on-delivery order'];

// Places the order on the GlowVai server (cash on delivery only). The server checks every product, works out the
// total and creates the order id; this screen only shows the result.
export const PaymentProcessingScreen: React.FC = () => {
  const { navigate, showToast, customerDetails } = useApp();
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const address = useDeliveryAddress();
  const customer = useCustomer();
  const [step, setStep] = useState(0);
  const [amount] = useState(() => computeCartTotals(Object.values(useCartStore.getState().items), couponCode, address?.fullAddress).grandTotal);
  const started = useRef(false);

  useEffect(() => {
    // Runs once per mount, even under React strict-mode double effects.
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const startedAt = Date.now();
      const cartItems = Object.values(useCartStore.getState().items);
      if (cartItems.length === 0) {
        navigate('cart-tab');
        return;
      }
      if (!address?.serviceable) {
        navigate('checkout-review');
        return;
      }
      if (!customerDetails) {
        navigate('login', { returnTo: 'checkout-payment-method' });
        return;
      }

      const result = await placeCartOrder({
        items: cartItems,
        address,
        couponCode,
        customer: { name: customer.name, phone: customer.phone },
      });
      setStep(STEPS.length);

      const remaining = MIN_DISPLAY_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      if (result.ok && result.data?.orderId) {
        useCartStore.getState().clearCart();
        void useCustomerStore.getState().loadOrders();
        navigate('checkout-payment-success', {
          orderId: result.data.orderId,
          amount: result.data.pricing?.grandTotal ?? amount,
          method: 'cod',
          confirmed: true,
        });
      } else {
        const message = result.error || 'The order could not be placed. Try again.';
        showToast('The order could not be placed');
        navigate('checkout-payment-failed', { error: message, amount, method: 'cod' });
      }
    };

    void run();
  }, []);

  return (
    <main className="commerce-screen commerce-processing">
      <header className="commerce-processing-head">
        <span className="commerce-brand">
          <Shield size={17} />
          glowvai
        </span>
        <span>Secure checkout</span>
      </header>

      <div className="commerce-processing-body">
        <div className="commerce-processing-hero">
          <div className="commerce-orb" aria-hidden="true">
            <span className="commerce-orb-pulse" />
            <span className="commerce-orb-spin" />
            <span className="commerce-orb-core">
              <Lock size={24} />
            </span>
          </div>
          <h1>Placing your order</h1>
          <p>Please don’t close this screen or press back.</p>
        </div>

        <div className="commerce-processing-detail" role="status" aria-live="polite">
          <dl className="commerce-processing-summary">
            <div>
              <dt>Order total (shown in your bag)</dt>
              <dd>₹{amount}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>Cash on delivery</dd>
            </div>
          </dl>

          <ol className="commerce-processing-steps">
            {STEPS.map((label, index) => (
              <li key={label} className={index < step ? 'is-done' : index === step ? 'is-active' : ''}>
                {index < step ? <CheckCircle2 size={18} /> : <span className="commerce-step-dot" />}
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
};
