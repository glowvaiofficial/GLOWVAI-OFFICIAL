import React from 'react';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals, COUPON_CAP, COUPON_CODE, COUPON_RATE, FREE_DELIVERY_THRESHOLD } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { BillRows, DeliveryPill, FlowHeader, useDeliveryAddress, useDeliveryMinutes } from './components/shared';

export const CartScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const items = useCartStore((s) => s.items);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponApplied = useCheckoutSession((s) => s.couponApplied);
  const setCouponApplied = useCheckoutSession((s) => s.setCouponApplied);
  const address = useDeliveryAddress();
  const minutes = useDeliveryMinutes();

  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponApplied);

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen commerce-cart">
        <FlowHeader title="Your cart" onBack={goBack} />
        <div className="commerce-empty-state">
          <span className="commerce-empty-icon">
            <ShoppingBag size={34} />
          </span>
          <h2>Your cart is empty</h2>
          <p>Add your skincare and beauty essentials, then check out here.</p>
          <button className="commerce-primary" onClick={() => navigate('home')}>
            Start shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="commerce-screen commerce-cart">
      <FlowHeader
        title="Your cart"
        subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'} · ${address.city}`}
        onBack={goBack}
        right={<DeliveryPill minutes={minutes} />}
      />

      <div className="commerce-body commerce-split">
        <div className="commerce-col">
          <section className="commerce-card commerce-progress">
            <div className="commerce-progress-top">
              <Truck size={17} />
              <p>
                {totals.amountNeededForFreeDelivery > 0
                  ? `Add ₹${totals.amountNeededForFreeDelivery} more for free delivery`
                  : 'You unlocked free express delivery'}
              </p>
              <b>
                ₹{totals.discountedTotal} / ₹{FREE_DELIVERY_THRESHOLD}
              </b>
            </div>
            <div className="commerce-bar" role="progressbar" aria-label="Progress to free delivery" aria-valuemin={0} aria-valuemax={FREE_DELIVERY_THRESHOLD} aria-valuenow={Math.min(totals.discountedTotal, FREE_DELIVERY_THRESHOLD)}>
              <span style={{ width: `${totals.freeDeliveryProgress * 100}%` }} />
            </div>
          </section>

          <section className="commerce-card" aria-label="Items in cart">
            <div className="commerce-card-head">
              <h2>
                {cartItems.length} {cartItems.length === 1 ? 'product' : 'products'}
              </h2>
              <button className="commerce-link is-muted" onClick={() => clearCart()}>
                Clear cart
              </button>
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
                  </p>
                  <div className="commerce-line-foot">
                    <div className="commerce-stepper">
                      <button
                        onClick={() => {
                          safeHapticSelection();
                          decrementItem(item.productId);
                        }}
                        aria-label={`Remove one ${item.name}`}
                      >
                        <Minus size={14} />
                      </button>
                      <b>{item.quantity}</b>
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
                    <button className="commerce-remove" onClick={() => removeItem(item.productId)}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="commerce-col commerce-side" aria-label="Order summary">
          <section className="commerce-card commerce-coupon">
            <Tag size={18} />
            <div>
              <b>{COUPON_CODE}</b>
              <p>{couponApplied ? `Applied · You save ₹${totals.couponDiscount}` : `${COUPON_RATE * 100}% off, up to ₹${COUPON_CAP}`}</p>
            </div>
            <button
              className={couponApplied ? 'commerce-chip is-on' : 'commerce-chip'}
              onClick={() => {
                safeHapticImpact();
                setCouponApplied(!couponApplied);
                showToast(couponApplied ? 'Coupon removed' : `${COUPON_CODE} applied`);
              }}
            >
              {couponApplied ? 'Remove' : 'Apply'}
            </button>
          </section>

          <section className="commerce-card commerce-bill" aria-labelledby="cart-bill-title">
            <h2 id="cart-bill-title">Order summary</h2>
            <BillRows
              rows={[
                { label: 'Item total', value: totals.itemTotal },
                totals.catalogSavings > 0 && { label: 'Product discount', value: totals.catalogSavings, saving: true },
                couponApplied && totals.couponDiscount > 0 && { label: `Coupon (${COUPON_CODE})`, value: totals.couponDiscount, saving: true },
                { label: 'Delivery', value: totals.deliveryFee, free: totals.deliveryFee === 0 },
              ]}
              totalLabel="To pay"
              total={totals.grandTotal}
            />
            {totals.totalSavings > 0 && (
              <p className="commerce-assure">
                <ShieldCheck size={14} /> You save ₹{totals.totalSavings} on this order
              </p>
            )}
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar">
        <div>
          <small>Total payable</small>
          <b>₹{totals.grandTotal}</b>
        </div>
        <button
          className="commerce-primary"
          onClick={() => {
            safeHapticImpact();
            navigate('checkout-review');
          }}
        >
          Checkout <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
};
