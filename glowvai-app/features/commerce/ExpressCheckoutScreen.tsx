import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Minus, Package, Plus, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { initiateRazorpayOrder, type InitiatePaymentParams } from '../../core/services/paymentService';
import { verifyOrderPayment } from '../../core/services/orderService';
import { computeCartTotals } from './lib/pricing';
import { newOrderId, payChoiceMeta, PAY_CHOICES, useCheckoutSession, type PayChoice } from './lib/checkoutSession';
import { placeCartOrder, sendDispatchAlert } from './lib/orderPlacement';
import { BillRows, DeliveryAddressCard, useCustomer, useDeliveryAddress } from './components/shared';

type Stage = 'cart_review' | 'payment_selection' | 'order_processing' | 'live_tracking';

const TIP_OPTIONS = [0, 10, 20, 30];

export const ExpressCheckoutScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const items = useCartStore((s) => s.items);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const address = useDeliveryAddress();
  const customer = useCustomer();

  const [stage, setStage] = useState<Stage>('cart_review');
  const [tip, setTip] = useState(0);
  const [avoidCalling, setAvoidCalling] = useState(false);
  const [dontRingBell, setDontRingBell] = useState(true);
  const [pay, setPay] = useState<PayChoice>('phonepe');
  const [orderId, setOrderId] = useState('');
  const [placedEta, setPlacedEta] = useState<number | undefined>(undefined);

  const cartItems = Object.values(items);
  // Same pricing rules as the cart and checkout; the tip is added on top.
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress);
  const payable = totals.grandTotal + tip;
  const canPay = Boolean(address?.serviceable);

  const placeOrder = async (choice: PayChoice) => {
    if (!address?.serviceable) return;
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

      const session = await initiateRazorpayOrder({
        orderId: id,
        orderAmount: payable,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        paymentMethod: meta.method as InitiatePaymentParams['paymentMethod'],
      });
      // Fail closed: an online payment counts only when the server verified it.
      const ok = session.success === true && (choice === 'cod' || (await verifyOrderPayment(id, payable)) === true);
      if (!ok) throw new Error('payment not confirmed');

      sendDispatchAlert(input);
      setPlacedEta(address.etaMinutes);
      clearCart();
      setStage('live_tracking');
    } catch {
      showToast(choice === 'cod' ? 'Could not place the order. Please try again.' : 'Payment could not be confirmed. Please try again.');
      setStage('payment_selection');
    }
  };

  if (stage === 'order_processing') {
    return (
      <main className="commerce-screen commerce-express is-center" role="status">
        <span className="commerce-spinner" aria-hidden="true" />
        <h1>{pay === 'cod' ? 'Placing your order' : 'Confirming your payment'}</h1>
        <p>Please don’t close this screen or press back.</p>
      </main>
    );
  }

  if (stage === 'live_tracking') {
    return (
      <main className="commerce-screen commerce-express is-center is-done">
        <span className="commerce-result-icon is-success">
          <CheckCircle2 size={34} />
        </span>
        <h1>Order placed</h1>
        <p>
          Order {orderId}
          {placedEta ? ` · delivery in about ${placedEta} minutes` : ''}
        </p>
        <p>Order tracking shows each update and your delivery OTP for the handover.</p>
        <div className="commerce-center-actions">
          <button className="commerce-primary" onClick={() => navigate('orders-tracking', { orderId })}>
            <Package size={18} /> Track order
          </button>
          <button className="commerce-ghost" onClick={() => navigate('home')}>
            Back to shopping
          </button>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-express is-center">
        <span className="commerce-empty-icon">
          <ShoppingBag size={34} />
        </span>
        <h1>Your cart is empty</h1>
        <p>Add a product to use express checkout.</p>
        <button className="commerce-primary" onClick={() => navigate('home')}>
          Start shopping
        </button>
      </main>
    );
  }

  const billCard = (cta: React.ReactNode) => (
    <aside className="commerce-aside">
      <section className="commerce-card commerce-bill" aria-labelledby="express-bill-title">
        <h2 id="express-bill-title">Bill details</h2>
        <BillRows totals={totals} tip={tip} totalLabel="Grand total" />
        {totals.totalSavings > 0 && (
          <p className="commerce-assure">
            <ShieldCheck size={14} /> You save ₹{totals.totalSavings} on this order
          </p>
        )}
        {cta}
      </section>
    </aside>
  );

  if (stage === 'payment_selection') {
    const placeLabel = pay === 'cod' ? 'Place order' : `Pay ₹${payable}`;
    return (
      <main className="commerce-screen commerce-express has-aside">
        <header className="commerce-head">
          <button className="commerce-icon-btn" onClick={() => setStage('cart_review')} aria-label="Back to cart review">
            <ArrowLeft size={20} />
          </button>
          <div className="commerce-head-copy">
            <h1>Choose payment</h1>
            <p>Total ₹{payable}</p>
          </div>
        </header>
        <div className="commerce-body commerce-split">
          <div className="commerce-main">
            <fieldset className="commerce-card commerce-pay-group">
              <legend>Payment method</legend>
              <div className="commerce-pay-options">
                {PAY_CHOICES.map((option) => (
                  <label className={option.id === pay ? 'commerce-pay-option is-selected' : 'commerce-pay-option'} key={option.id}>
                    <input type="radio" name="express-pay" checked={option.id === pay} onChange={() => setPay(option.id)} />
                    <span>
                      <b>{option.label}</b>
                      <small>{option.sub}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          {billCard(
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={() => placeOrder(pay)} disabled={!canPay}>
              {placeLabel}
            </button>
          )}
        </div>
        <footer className="commerce-sticky-bar">
          <div>
            <small>Payable</small>
            <b>₹{payable}</b>
          </div>
          <button className="commerce-primary" onClick={() => placeOrder(pay)} disabled={!canPay}>
            {placeLabel}
          </button>
        </footer>
      </main>
    );
  }

  const toPayment = () => {
    if (!address) navigate('location-setup', { returnTo: 'checkout-express' });
    else setStage('payment_selection');
  };
  const nextLabel = address ? 'Select payment method' : 'Add delivery address';
  const nextDisabled = Boolean(address) && !canPay;

  return (
    <main className="commerce-screen commerce-express has-aside">
      <header className="commerce-head">
        <button className="commerce-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="commerce-head-copy">
          <h1>Express checkout</h1>
          <p>
            <Zap size={11} fill="currentColor" /> {address?.etaMinutes ? `Delivery in about ${address.etaMinutes} minutes` : 'Fast delivery'}
          </p>
        </div>
      </header>

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          <section className="commerce-card" aria-label="Items">
            <div className="commerce-card-head">
              <h2>Items ({totals.itemCount})</h2>
            </div>
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
                    <Minus size={14} />
                  </button>
                  <b>{item.quantity}</b>
                  <button onClick={() => incrementItem(item.productId)} aria-label={`Add one ${item.name}`}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </section>

          <DeliveryAddressCard address={address} onChange={() => navigate('address-saved', { returnTo: 'checkout-express' })} onAdd={() => navigate('location-setup', { returnTo: 'checkout-express' })} />

          {address && (
            <section className="commerce-card">
              <h2>Delivery preferences</h2>
              <label className="commerce-check">
                <input type="checkbox" checked={avoidCalling} onChange={() => setAvoidCalling(!avoidCalling)} />
                Avoid calling
              </label>
              <label className="commerce-check">
                <input type="checkbox" checked={dontRingBell} onChange={() => setDontRingBell(!dontRingBell)} />
                Don’t ring the bell
              </label>
            </section>
          )}

          <section className="commerce-card">
            <h2>Tip your delivery partner</h2>
            <div className="commerce-tips">
              {TIP_OPTIONS.map((amount) => (
                <button key={amount} className={tip === amount ? 'is-on' : ''} aria-pressed={tip === amount} onClick={() => setTip(tip === amount && amount !== 0 ? 0 : amount)}>
                  {amount === 0 ? 'No tip' : `₹${amount}`}
                </button>
              ))}
            </div>
          </section>
        </div>

        {billCard(
          <button className="commerce-primary is-wide commerce-aside-cta" onClick={toPayment} disabled={nextDisabled}>
            {nextLabel} <ArrowRight size={18} />
          </button>
        )}
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>{address ? `Delivering to ${address.label}` : 'Grand total'}</small>
          <b>₹{payable}</b>
        </div>
        <button className="commerce-primary" onClick={toPayment} disabled={nextDisabled}>
          {address ? 'Select payment' : 'Add address'} <ChevronRight size={16} />
        </button>
      </footer>
    </main>
  );
};

