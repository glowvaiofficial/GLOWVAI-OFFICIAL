import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { initiateRazorpayOrder, type InitiatePaymentParams } from '../../core/services/paymentService';
import { verifyOrderPayment } from '../../core/services/orderService';
import { computeCartTotals } from './lib/pricing';
import { newOrderId, payChoiceMeta, useCheckoutSession } from './lib/checkoutSession';
import { placeCartOrder, toLocalOrder } from './lib/orderPlacement';
import { useCustomer, useDeliveryAddress, useDeliveryMinutes } from './components/shared';

const MIN_DISPLAY_MS = 2800;

const STEPS = ['Creating order session', 'Verifying bank payment status', 'Confirming order and reserving stock'];

export const PaymentProcessingScreen: React.FC = () => {
  const { navigate, showToast, recordOrder } = useApp();
  const etaMinutes = useDeliveryMinutes();
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const payChoice = useCheckoutSession((s) => s.payChoice);
  const address = useDeliveryAddress();
  const customer = useCustomer();
  const [step, setStep] = useState(0);
  const [orderId] = useState(() => newOrderId());
  const [amount] = useState(() => computeCartTotals(Object.values(useCartStore.getState().items), couponApplied).grandTotal);
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
      const meta = payChoiceMeta(payChoice);
      const totals = computeCartTotals(cartItems, couponApplied);
      const isCod = payChoice === 'cod';

      let ok = false;
      let orderInput: Parameters<typeof placeCartOrder>[0] | null = null;
      try {
        // Order is written first so a UPI handoff (which leaves the page) cannot lose it.
        orderInput = {
          orderId,
          items: cartItems,
          totals,
          pay: payChoice,
          paid: false,
          deliveryType: 'STANDARD_ECOMMERCE',
          address,
          customer: { userId: customer.userId, name: customer.name, phone: customer.phone },
        };
        await placeCartOrder(orderInput);
        setStep(1);

        const session = await initiateRazorpayOrder({
          orderId,
          orderAmount: totals.grandTotal,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          paymentMethod: meta.method as InitiatePaymentParams['paymentMethod'],
        });

        // An online payment only counts when the gateway returned a real order. paymentService falls back to a
        // simulated success when the backend is unreachable, and that must not show as a paid order.
        ok = session.success && (isCod || (Boolean(session.razorpayOrderId) && (await verifyOrderPayment(orderId, totals.grandTotal))));
        setStep(2);
      } catch {
        ok = false;
      }

      const remaining = MIN_DISPLAY_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      if (orderInput) recordOrder(toLocalOrder(orderInput, ok && !isCod, etaMinutes));
      if (ok) {
        useCartStore.getState().clearCart();
        navigate('checkout-payment-success', { orderId, amount: totals.grandTotal, method: payChoice });
      } else {
        showToast('Payment could not be confirmed');
        navigate('checkout-payment-failed', { orderId, amount: totals.grandTotal, method: payChoice });
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
        <div className="commerce-orb" aria-hidden="true">
          <span className="commerce-orb-pulse" />
          <span className="commerce-orb-spin" />
          <span className="commerce-orb-core">
            <Lock size={24} />
          </span>
        </div>
        <h1>Securely processing your payment</h1>
        <p>Please don’t close this screen or press back.</p>

        <dl className="commerce-processing-summary">
          <div>
            <dt>Order total</dt>
            <dd>₹{amount}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{payMethodLabel(payChoice)}</dd>
          </div>
          <div>
            <dt>Order ID</dt>
            <dd className="is-muted">{orderId}</dd>
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

        <p className="commerce-processing-foot">{payChoice === 'cod' ? 'Cash on delivery: pay the rider at handover' : 'Online payments are processed by Razorpay'}</p>
      </div>
    </main>
  );
};

const payMethodLabel = (id: string) => {
  switch (id) {
    case 'gpay':
      return 'UPI (Google Pay)';
    case 'phonepe':
      return 'UPI (PhonePe)';
    case 'paytm':
      return 'UPI (Paytm)';
    case 'bhim':
      return 'UPI (BHIM)';
    case 'card':
      return 'Credit or debit card';
    default:
      return 'Cash on delivery';
  }
};
