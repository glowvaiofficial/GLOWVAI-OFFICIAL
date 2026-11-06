import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals, FREE_DELIVERY_ABOVE, normaliseCoupon } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { BillRows, CheckoutSteps, DeliveryPill, FlowHeader, useDeliveryAddress } from './components/shared';

export const CartScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const items = useCartStore((s) => s.items);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const setCouponCode = useCheckoutSession((s) => s.setCouponCode);
  const address = useDeliveryAddress();
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress);

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normaliseCoupon(codeInput);
    if (!code) {
      setCodeError(codeInput.trim() ? 'That code is not valid.' : 'Enter a coupon code.');
      return;
    }
    safeHapticImpact();
    setCouponCode(code);
    setCodeInput('');
    setCodeError(null);
    showToast(`${code} applied`);
  };

  const checkout = () => {
    safeHapticImpact();
    navigate('checkout-review');
  };

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-cart is-empty">
        <FlowHeader title="Your cart" onBack={goBack} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon">
              <ShoppingBag size={34} />
            </span>
            <h2>Your cart is empty</h2>
            <p>Add skincare and beauty essentials from the shop and they will show up here.</p>
            <button className="commerce-primary" onClick={() => navigate('home')}>
              Start shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  const showProgress = totals.deliveryFee > 0 || totals.isFreeDelivery;

  return (
    <main className="commerce-screen commerce-cart has-aside">
      <FlowHeader
        title="Your cart"
        subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}${address ? ` · ${address.city}` : ''}`}
        onBack={goBack}
        right={<DeliveryPill minutes={address?.etaMinutes} />}
      />
      <CheckoutSteps step={1} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          {showProgress && (
            <section className="commerce-card commerce-progress">
              <div className="commerce-progress-top">
                <Truck size={17} />
                <p>
                  {totals.isFreeDelivery
                    ? 'You get free delivery on this order'
                    : `Add ₹${totals.amountNeededForFreeDelivery} more for free delivery`}
                </p>
                <b>Free above ₹{FREE_DELIVERY_ABOVE}</b>
              </div>
              <div className="commerce-bar" aria-hidden="true">
                <span style={{ width: `${totals.freeDeliveryProgress * 100}%` }} />
              </div>
            </section>
          )}

          <section className="commerce-card" aria-label="Items in cart">
            <div className="commerce-card-head">
              <h2>Items in your cart ({cartItems.length})</h2>
              {confirmClear ? (
                <span className="commerce-inline-confirm">
                  Remove all items?
                  <button className="commerce-link" onClick={() => setConfirmClear(false)}>
                    Keep
                  </button>
                  <button
                    className="commerce-link is-danger"
                    onClick={() => {
                      clearCart();
                      setConfirmClear(false);
                    }}
                  >
                    Clear
                  </button>
                </span>
              ) : (
                <button className="commerce-link" onClick={() => setConfirmClear(true)}>
                  Clear cart
                </button>
              )}
            </div>
            {cartItems.map((item) => (
              <article className="commerce-line" key={item.productId}>
                <div className="commerce-thumb">
                  {item.image ? <img src={item.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <ShoppingBag size={22} />}
                </div>
                <div className="commerce-line-copy">
                  <small>{item.brand}</small>
                  <h3>{item.name}</h3>
                  <p>
                    <b>₹{item.price * item.quantity}</b>
                    {item.mrp && item.mrp > item.price && <s>₹{item.mrp * item.quantity}</s>}
                    {item.quantity > 1 && <span className="commerce-each">₹{item.price} each</span>}
                  </p>
                </div>
                <div className="commerce-line-foot">
                  <div className="commerce-stepper">
                    <button
                      onClick={() => {
                        safeHapticSelection();
                        decrementItem(item.productId);
                      }}
                      aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Remove one ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <b aria-live="polite">{item.quantity}</b>
                    <button
                      onClick={() => {
                        safeHapticSelection();
                        incrementItem(item.productId);
                      }}
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="commerce-remove" onClick={() => removeItem(item.productId)} aria-label={`Remove ${item.name} from cart`}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="commerce-aside">
          <section className="commerce-card commerce-coupon" aria-label="Coupon">
            {totals.couponCode ? (
              <div className="commerce-coupon-applied">
                <Tag size={18} />
                <div>
                  <b>{totals.couponCode} applied</b>
                  <p>You save ₹{totals.couponDiscount}</p>
                </div>
                <button
                  className="commerce-link is-danger"
                  onClick={() => {
                    setCouponCode(null);
                    showToast('Coupon removed');
                  }}
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <form className="commerce-coupon-form" onSubmit={applyCoupon} noValidate>
                <label className="commerce-search">
                  <Tag size={18} />
                  <input
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value.toUpperCase());
                      setCodeError(null);
                    }}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                    aria-invalid={codeError ? true : undefined}
                    autoCapitalize="characters"
                  />
                </label>
                <button className="commerce-chip" type="submit">
                  Apply
                </button>
                {codeError && <em className="commerce-error">{codeError}</em>}
              </form>
            )}
          </section>

          <section className="commerce-card commerce-bill" aria-labelledby="cart-bill-title">
            <h2 id="cart-bill-title">Bill details</h2>
            <BillRows totals={totals} />
            {!address && <p className="commerce-bill-note">Delivery charge is confirmed once you add your address.</p>}
            {totals.totalSavings > 0 && (
              <p className="commerce-assure">
                <ShieldCheck size={14} /> You save ₹{totals.totalSavings} on this order
              </p>
            )}
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={checkout}>
              Proceed to checkout <ArrowRight size={18} />
            </button>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Total payable</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button className="commerce-primary" onClick={checkout}>
          Checkout <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
};
