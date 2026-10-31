import React, { useState } from 'react';
import { ArrowLeft, Bike, CheckCircle2, ChevronRight, Clock, MapPin, ShoppingBag, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { initiateRazorpayOrder, type InitiatePaymentParams } from '../../core/services/paymentService';
import { verifyOrderPayment } from '../../core/services/orderService';
import type { CartItem } from '../../core/state/cartStore';
import { computeCartTotals, type CartTotals } from './lib/pricing';
import { newOrderId, payChoiceMeta, PAY_CHOICES, type PayChoice } from './lib/checkoutSession';
import { placeCartOrder, sendDispatchAlert } from './lib/orderPlacement';
import { useCustomer, useDeliveryAddress } from './components/shared';

type Stage = 'cart_review' | 'payment_selection' | 'order_processing' | 'live_tracking';

const TIP_OPTIONS = [0, 10, 20, 30];
const EXPRESS_COUPON_MIN = 999;
const EXPRESS_COUPON_VALUE = 50;

// Express keeps the mobile flow's own pricing: free delivery and a flat coupon above ₹999.
const expressTotals = (items: CartItem[]): CartTotals => {
  const base = computeCartTotals(items, false);
  const coupon = base.discountedTotal >= EXPRESS_COUPON_MIN ? EXPRESS_COUPON_VALUE : 0;
  return {
    ...base,
    couponDiscount: coupon,
    deliveryFee: 0,
    isFreeDelivery: true,
    grandTotal: Math.max(1, base.discountedTotal - coupon),
    totalSavings: base.catalogSavings + coupon,
  };
};

export const ExpressCheckoutScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const items = useCartStore((s) => s.items);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const address = useDeliveryAddress();
  const customer = useCustomer();

  const [stage, setStage] = useState<Stage>('cart_review');
  const [tip, setTip] = useState(0);
  const [avoidCalling, setAvoidCalling] = useState(false);
  const [dontRingBell, setDontRingBell] = useState(true);
  const [pay, setPay] = useState<PayChoice>('phonepe');
  const [orderId, setOrderId] = useState('');

  const cartItems = Object.values(items);
  const totals = expressTotals(cartItems);
  const payable = totals.grandTotal + tip;

  const placeOrder = async (choice: PayChoice) => {
    const id = newOrderId();
    const meta = payChoiceMeta(choice);
    const deliveryAddress = {
      ...address,
      deliveryInstructions: [dontRingBell ? 'Do not ring the bell' : '', avoidCalling ? 'Avoid calling' : ''].filter(Boolean).join(', ') || address.deliveryInstructions,
    };
    setOrderId(id);
    setPay(choice);
    setStage('order_processing');
    try {
      const input = {
        orderId: id,
        items: cartItems,
        totals,
        pay: choice,
        paid: false,
        deliveryType: 'EXPRESS_15_MIN' as const,
        address: deliveryAddress,
        customer: { userId: customer.userId, name: customer.name, phone: customer.phone },
        tipAmount: tip,
      };
      await placeCartOrder(input);
      sendDispatchAlert(input);

      const session = await initiateRazorpayOrder({
        orderId: id,
        orderAmount: payable,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        paymentMethod: meta.method as InitiatePaymentParams['paymentMethod'],
      });
      const ok = session.success && (choice === 'cod' || (await verifyOrderPayment(id, payable)));
      if (!ok) throw new Error('payment not confirmed');

      clearCart();
      setStage('live_tracking');
    } catch {
      showToast('Could not place the order. Please try again.');
      setStage('payment_selection');
    }
  };

  if (stage === 'order_processing') {
    return (
      <main className="commerce-screen commerce-express is-center">
        <span className="commerce-spinner" aria-hidden="true" />
        <h1>Placing your order</h1>
        <p>Connecting to the Glowway darkstore for packing…</p>
      </main>
    );
  }

  if (stage === 'live_tracking') {
    return (
      <main className="commerce-screen commerce-express">
        <header className="commerce-head">
          <span className="commerce-icon-btn is-static">
            <CheckCircle2 size={20} />
          </span>
          <div className="commerce-head-copy">
            <h1>Order on the way</h1>
            <p>{orderId}</p>
          </div>
        </header>
        <div className="commerce-body">
          <section className="commerce-card commerce-live">
            <span className="commerce-eta-icon">
              <Bike size={18} />
            </span>
            <div>
              <b>Arriving in about 12 minutes</b>
              <p>Packing at Glowway Darkstore Payikapuram</p>
            </div>
          </section>
          <section className="commerce-card commerce-otp">
            <span>Delivery OTP</span>
            <p>Your OTP is shown in order tracking. Share it with the rider at handover.</p>
          </section>
          <section className="commerce-card">
            <div className="commerce-card-head">
              <h2>Delivering to</h2>
            </div>
            <p className="commerce-muted">
              <MapPin size={14} /> {address.fullAddress}
            </p>
          </section>
        </div>
        <footer className="commerce-sticky-bar">
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Back to shopping
          </button>
          <button className="commerce-primary" onClick={() => navigate('orders-tracking', { orderId })}>
            Track order
          </button>
        </footer>
      </main>
    );
  }

  if (stage === 'payment_selection') {
    return (
      <main className="commerce-screen commerce-express">
        <header className="commerce-head">
          <button className="commerce-icon-btn" onClick={() => setStage('cart_review')} aria-label="Back to cart review">
            <ArrowLeft size={20} />
          </button>
          <div className="commerce-head-copy">
            <h1>Choose payment</h1>
            <p>Total ₹{payable}</p>
          </div>
        </header>
        <div className="commerce-body">
          <section className="commerce-card commerce-pay-group">
            <h2>Choose a method</h2>
            {PAY_CHOICES.map((option) => (
              <label className={option.id === pay ? 'commerce-pay-option is-selected' : 'commerce-pay-option'} key={option.id}>
                <input type="radio" name="express-pay" checked={option.id === pay} onChange={() => setPay(option.id)} />
                <span>
                  <b>{option.label}</b>
                  <small>{option.sub}</small>
                </span>
              </label>
            ))}
          </section>
        </div>
        <footer className="commerce-sticky-bar">
          <div>
            <small>Payable</small>
            <b>₹{payable}</b>
          </div>
          <button className="commerce-primary" onClick={() => placeOrder(pay)}>
            Place order
          </button>
        </footer>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-express is-center">
        <ShoppingBag size={40} />
        <h1>Your cart is empty</h1>
        <button className="commerce-primary" onClick={() => navigate('home')}>
          Start shopping
        </button>
      </main>
    );
  }

  return (
    <main className="commerce-screen commerce-express">
      <header className="commerce-head">
        <button className="commerce-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="commerce-head-copy">
          <h1>Bill total: ₹{payable}</h1>
          <p>
            <Zap size={11} fill="currentColor" /> 10–12 min delivery from Glowway Darkstore
          </p>
        </div>
      </header>

      <div className="commerce-body">
        <section className="commerce-card commerce-savings">
          <CheckCircle2 size={16} />
          <span>You saved ₹{totals.totalSavings} on this order</span>
        </section>

        <section className="commerce-card" aria-label="Items">
          {cartItems.map((item) => (
            <div className="commerce-line is-compact" key={item.productId}>
              <div className="commerce-line-copy">
                <h3>{item.name}</h3>
                <small>
                  {item.brand} · ₹{item.price}
                </small>
              </div>
              <div className="commerce-stepper">
                <button onClick={() => decrementItem(item.productId)} aria-label={`Remove one ${item.name}`}>
                  −
                </button>
                <b>{item.quantity}</b>
                <button onClick={() => incrementItem(item.productId)} aria-label={`Add one ${item.name}`}>
                  +
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="commerce-card">
          <div className="commerce-card-head">
            <h2>Delivery address</h2>
            <button className="commerce-link" onClick={() => navigate('address-saved')}>
              Change <ChevronRight size={13} />
            </button>
          </div>
          <p className="commerce-muted">
            <MapPin size={14} /> {address.fullAddress}
          </p>
          <label className="commerce-check">
            <input type="checkbox" checked={avoidCalling} onChange={() => setAvoidCalling(!avoidCalling)} />
            Avoid calling
          </label>
          <label className="commerce-check">
            <input type="checkbox" checked={dontRingBell} onChange={() => setDontRingBell(!dontRingBell)} />
            Don’t ring the bell
          </label>
        </section>

        <section className="commerce-card">
          <h2>Tip your delivery partner</h2>
          <div className="commerce-tips">
            {TIP_OPTIONS.map((amount) => (
              <button key={amount} className={tip === amount ? 'is-on' : ''} onClick={() => setTip(tip === amount && amount !== 0 ? 0 : amount)}>
                {amount === 0 ? 'No tip' : `₹${amount}`}
              </button>
            ))}
          </div>
        </section>

        <section className="commerce-card commerce-bill">
          <h2>Bill details</h2>
          <dl>
            <div>
              <dt>Items total</dt>
              <dd>₹{totals.discountedTotal}</dd>
            </div>
            <div>
              <dt>Delivery charge</dt>
              <dd className="is-good">FREE</dd>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="is-saving">
                <dt>Coupon</dt>
                <dd>−₹{totals.couponDiscount}</dd>
              </div>
            )}
            {tip > 0 && (
              <div>
                <dt>Delivery partner tip</dt>
                <dd>₹{tip}</dd>
              </div>
            )}
            <div className="commerce-bill-total">
              <dt>Grand total</dt>
              <dd>₹{payable}</dd>
            </div>
          </dl>
          <p className="commerce-assure">
            <Clock size={13} /> Free 10-minute delivery across Vijayawada
          </p>
        </section>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Delivering to Home</small>
          <b>₹{payable}</b>
        </div>
        <button className="commerce-primary" onClick={() => setStage('payment_selection')}>
          Select payment method
        </button>
      </footer>
    </main>
  );
};
