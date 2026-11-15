import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { lineKeyOf, lineStillSold } from '../../../lib/shop/variants';
import { useCustomerStore } from '../../core/state/customerStore';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { placeCartOrder } from './lib/orderPlacement';
import { PAY_METHOD_LABEL, decidePlacement, parsePayMethod, toApiPaymentMethod, type PayMethod } from './lib/paymentMethod';
import { getLiveCatalog } from '../../core/data/indianSkincareCatalog';
import { setSubstitutionPreference } from '../../core/services/shopTracking';
import { fetchShopConfig, verifyOnlinePayment } from '../../core/services/shopApi';
import { openRazorpayCheckout } from './lib/razorpayCheckout';
import { attemptFor, orderSignature, replayDecision } from './lib/orderAttemptKey';
import { choiceSummary, methodPrefillFor } from './lib/paymentChoice';
import { confirmPayment } from './lib/paymentRecheck';
import { fetchOrderTracking } from '../../core/services/shopTracking';
import { markOrderSeen } from '../../core/notifications/markSeen';
import { useCustomer, useDeliveryAddress } from './components/shared';

const MIN_DISPLAY_MS = 1200;

// The steps shown while the order is placed. A step is marked done only when the server has answered.
const STEPS: Record<PayMethod, string[]> = {
  cod: ['Checking prices and availability', 'Saving your cash-on-delivery order'],
  online: ['Checking prices and availability', 'Starting secure payment with Razorpay'],
};

// Places the order on the GlowVai server. The method is read from the checkout store (the source of truth); the
// route param only has to agree with it. Cash on delivery is placed by the server. An online order is placed only
// after Razorpay confirms the payment; an online reply without a payment is a failure, never a cash-on-delivery success.
// This screen is a full-viewport overlay with no back control: it stays until the placement has ended.
export const PaymentProcessingScreen: React.FC = () => {
  const { navigate, showToast, customerDetails, activeParams } = useApp();
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const bagQuote = useCheckoutSession((s) => s.bagQuote);
  const payMethod = useCheckoutSession((s) => s.payMethod);
  const paymentChoice = useCheckoutSession((s) => s.paymentChoice);
  const tip = useCheckoutSession((s) => s.tip);
  const address = useDeliveryAddress();
  const customer = useCustomer();
  const method = parsePayMethod(payMethod);
  const [step, setStep] = useState(0);
  const [amount] = useState(() => computeCartTotals(Object.values(useCartStore.getState().items), couponCode, address?.fullAddress, useCheckoutSession.getState().bagQuote).grandTotal + tip);
  const started = useRef(false);
  const steps = STEPS[method ?? 'cod'];

  useEffect(() => {
    // Runs once per mount, even under React strict-mode double effects.
    if (started.current) return;
    started.current = true;

    // Placement already ran in this session (for example the customer went back to this screen): never run it again.
    if (useCheckoutSession.getState().placement !== 'idle') {
      navigate('cart-tab');
      return;
    }
    useCheckoutSession.getState().setPlacement('running');

    const leave = (screen: 'checkout-review' | 'cart-tab' | 'customer-details', params?: Record<string, unknown>) => {
      useCheckoutSession.getState().setPlacement('finished');
      navigate(screen, params);
    };
    // A failure keeps the bag, so the customer can try again from the payment step.
    const fail = (error: string, failedMethod: PayMethod | null) => {
      useCheckoutSession.getState().setPlacement('finished');
      navigate('checkout-payment-failed', { error, amount, ...(failedMethod ? { method: failedMethod } : {}) });
    };

    const run = async () => {
      const startedAt = Date.now();
      const allItems = Object.values(useCartStore.getState().items);
      if (allItems.length === 0) {
        leave('cart-tab');
        return;
      }
      // Only products the shop sells right now can be ordered. Anything else (old saved items) is removed from the bag,
      // and the customer is told which items, instead of the order failing with a vague message.
      const live = getLiveCatalog();
      if (live.length === 0) {
        fail('Products are still loading. Check your connection and try again.', method);
        return;
      }
      // Old lines move to their default variant, and lines already in the bag take the current variant prices.
      useCartStore.getState().reconcileWithCatalog(live);
      const liveById = new Map(live.map((p) => [p.id, p]));
      // A line is kept only when its product, and its variant when it has one, is still sold.
      const unavailable = Object.values(useCartStore.getState().items).filter((item) => !lineStillSold(item, liveById.get(item.productId)));
      if (unavailable.length > 0) {
        unavailable.forEach((item) => useCartStore.getState().removeItem(lineKeyOf(item.productId, item.variantId)));
        const names = unavailable.map((item) => item.name || item.productId).slice(0, 3).join(', ');
        fail(
          `We removed ${unavailable.length} item${unavailable.length === 1 ? '' : 's'} that ${unavailable.length === 1 ? 'is' : 'are'} no longer sold (${names}). Review your bag and place the order again.`,
          method
        );
        return;
      }
      if (!address?.serviceable) {
        leave('checkout-review');
        return;
      }
      // A delivery time must be chosen on the review step before paying.
      if (!useCheckoutSession.getState().slotId) {
        leave('checkout-review');
        return;
      }
      if (!customerDetails) {
        leave('customer-details', { returnTo: 'checkout-payment-method' });
        return;
      }

      // The method the customer chose. A route param that disagrees with the stored choice is refused.
      const requested = parsePayMethod((activeParams as { method?: unknown } | null)?.method);
      if (!method || (requested && requested !== method)) {
        fail('Your payment choice changed. Review your order and choose how to pay again.', null);
        return;
      }

      // One Idempotency-Key per checkout attempt: the same request sent again (Try again after a lost answer or a closed
      // payment window) gets the order the server already created, never a second one.
      const session = useCheckoutSession.getState();
      const attempt = attemptFor(
        session.orderAttempt,
        orderSignature({
          items: allItems,
          addressId: address.savedId ?? null,
          address: { fullAddress: address.fullAddress, city: address.city, pincode: address.pincode, landmark: address.landmark ?? '' },
          deliverySlot: session.slotId,
          couponCode,
          tip: session.tip,
          coinsToRedeem: session.coinsToRedeem,
          paymentMethod: toApiPaymentMethod(method),
        })
      );
      session.setOrderAttempt(attempt);
      const result = await placeCartOrder({
        items: allItems,
        address,
        couponCode,
        coinsToRedeem: session.coinsToRedeem,
        tip: session.tip,
        deliverySlot: session.slotId,
        customerLocation: session.customerLocation,
        paymentMethod: toApiPaymentMethod(method),
        customer: { name: customer.name, phone: customer.phone },
        idempotencyKey: attempt.key,
      });
      const replay = result.ok ? replayDecision(result.data) : null;
      if (replay === 'reset') {
        // The earlier order for this key can no longer be paid (its payment window closed or it was cancelled).
        useCheckoutSession.getState().setOrderAttempt(null);
        fail('Your earlier checkout has expired. Nothing more was charged. Review your order and place it again.', method);
        return;
      }
      const decision = replay === 'placed' && result.data?.orderId
        ? { kind: 'placed' as const, orderId: result.data.orderId, total: result.data.pricing?.grandTotal }
        : decidePlacement(method, result);

      if (decision.kind === 'razorpay') {
        try {
          const config = await fetchShopConfig();
          const emi = config.ok && config.data?.payments?.emi?.available === true;
          const paid = await openRazorpayCheckout(decision.payment, { name: customer.name, contact: customer.phone }, { emi, method: methodPrefillFor(useCheckoutSession.getState().paymentChoice) });
          // Money may already be taken here. A lost verify answer is retried and then the order itself is read, so a
          // network drop is never shown as a failed payment. The bag is cleared only once the order is confirmed.
          const outcome = await confirmPayment(decision.orderId, {
            verify: async () => {
              const r = await verifyOnlinePayment(paid);
              return { ok: r.ok, status: r.status, orderId: r.data?.orderId ?? null, error: r.error };
            },
            readOrderStatus: async (id) => {
              const r = await fetchOrderTracking(id);
              return { ok: r.ok, status: r.status, orderStatus: r.data?.tracking?.status ?? null };
            },
            wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          });
          if (outcome.kind !== 'placed') {
            // The order stays as it is on the server; the bag is kept, and the message says to check My orders first.
            if (outcome.kind === 'unconfirmed') void useCustomerStore.getState().loadOrders();
            fail(outcome.message, 'online');
            return;
          }
          useCartStore.getState().clearCart();
          useCheckoutSession.getState().setPlacement('finished');
          useCheckoutSession.getState().setOrderAttempt(null);
          // The confirmation screen shows this order, so the order-status popup must not announce it again.
          markOrderSeen(outcome.orderId, 'PLACED');
          // The preference is saved on the placed order. A failure here does not undo the order: it can be changed later.
          void setSubstitutionPreference(outcome.orderId, useCheckoutSession.getState().substitutionPreference);
          void useCustomerStore.getState().loadOrders();
          navigate('checkout-payment-success', {
            orderId: outcome.orderId,
            amount: decision.payment.amount / 100,
            method: 'online',
            confirmed: true,
          });
        } catch (err) {
          const dismissed = err instanceof Error && err.message === 'DISMISSED';
          fail(
            dismissed
              ? 'Payment was not completed. Your bag is saved, so you can pay again.'
              : err instanceof Error ? err.message : 'The payment could not be confirmed.',
            'online'
          );
        }
        return;
      }

      setStep(steps.length);
      const remaining = MIN_DISPLAY_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      if (decision.kind === 'placed') {
        useCartStore.getState().clearCart();
        useCheckoutSession.getState().setPlacement('finished');
        useCheckoutSession.getState().setOrderAttempt(null);
        // The confirmation screen shows this order, so the order-status popup must not announce it again.
        markOrderSeen(decision.orderId, 'PLACED');
        void setSubstitutionPreference(decision.orderId, useCheckoutSession.getState().substitutionPreference);
        void useCustomerStore.getState().loadOrders();
        navigate('checkout-payment-success', {
          orderId: decision.orderId,
          amount: decision.total ?? amount,
          // 'online' only when an earlier attempt of this checkout was already paid (a replayed order).
          method,
          confirmed: true,
        });
      } else {
        showToast('The order could not be placed');
        fail(decision.error, method);
      }
    };

    void run();
  }, []);

  return (
    <main className="commerce-screen commerce-processing" aria-busy="true">
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
              <dt>Order total</dt>
              <dd>₹{amount}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{method ? (method === 'online' ? `${choiceSummary(paymentChoice).title} via Razorpay` : PAY_METHOD_LABEL[method]) : 'Not chosen'}</dd>
            </div>
          </dl>

          <ol className="commerce-processing-steps">
            {steps.map((label, index) => (
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
