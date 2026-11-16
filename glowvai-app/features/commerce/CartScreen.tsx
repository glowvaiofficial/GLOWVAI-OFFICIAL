import React, { useState } from 'react';
import { ArrowRight, Check, ChevronRight, Heart, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { lineKeyOf } from '../../../lib/shop/variants';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { computeCartTotals, FREE_DELIVERY_ABOVE, normaliseCoupon } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { quoteBag } from './lib/bagQuote';
import { useDeliveryAddress } from './components/shared';
import { AddressBlock, CheckoutSteps, EmptyState, FreeDeliveryCard, HelpRow, PremiumHeader, PriceSummary, Thumb, rupee } from './components/premium';

type SkippedItem = { name: string; reason: string };

const readSkipped = (params: unknown): SkippedItem[] => {
  const list = (params as { reorderSkipped?: unknown } | null)?.reorderSkipped;
  if (!Array.isArray(list)) return [];
  return list
    .filter((i): i is SkippedItem => typeof i?.name === 'string' && typeof i?.reason === 'string')
    .slice(0, 20);
};

// Lists the items a "buy it again" could not add, and why. Shown whether or not the bag has other items.
const ReorderNotice: React.FC<{ items: SkippedItem[] }> = ({ items }) =>
  items.length === 0 ? null : (
    <section className="gvp-card gvp-notice" role="status" aria-label="Items not added">
      <h2>Not added from your last order</h2>
      <ul>
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`}>
            <b>{item.name}</b> <span className="gvp-muted">{item.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );

// The cart (step 1 of checkout). Phones: one column with the button pinned at the bottom. 1024px and wider: items on the
// left, the order summary and the button in a sticky column on the right.
export const CartScreen: React.FC = () => {
  const { goBack, navigate, showToast, activeParams, wishlist, toggleWishlist } = useApp();
  // Items from a "buy it again" that could not be added, with the reason (see useBuyAgain).
  const skipped = readSkipped(activeParams);
  const items = useCartStore((s) => s.items);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const setCouponCode = useCheckoutSession((s) => s.setCouponCode);
  const bagQuote = useCheckoutSession((s) => s.bagQuote);
  const setBagQuote = useCheckoutSession((s) => s.setBagQuote);
  const address = useDeliveryAddress();
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [editing, setEditing] = useState(false);

  const cartItems = Object.values(items);

  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress, bagQuote);

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (applying) return;
    const raw = codeInput.trim();
    if (!raw) {
      setCodeError('Enter a coupon code.');
      return;
    }
    safeHapticImpact();
    const builtIn = normaliseCoupon(raw);
    if (builtIn) {
      setCouponCode(builtIn);
      setCodeInput('');
      setCodeError(null);
      showToast(`${builtIn} applied`);
      return;
    }
    // An offer code is checked with the server before it is applied, so a wrong code is refused here, not at payment.
    const code = raw.toUpperCase();
    setApplying(true);
    let r: Awaited<ReturnType<typeof quoteBag>>;
    try {
      r = await quoteBag(code, cartItems);
    } catch {
      setApplying(false);
      setCodeError('Could not check this code. Try again.');
      return;
    }
    setApplying(false);
    if (!r.ok) {
      setCodeError(r.error);
      return;
    }
    setBagQuote(r.bag);
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
      <main className="commerce-screen gvp gvp-cart is-empty">
        <PremiumHeader brand title="Your cart" onBack={goBack} />
        <div className="commerce-body gvp-body">
          <ReorderNotice items={skipped} />
          <EmptyState Icon={ShoppingBag} title="Your cart is empty" body="Add skincare and beauty essentials from the shop and they will show up here." action="Start shopping" onAction={goBack} />
        </div>
      </main>
    );
  }

  const couponBlock = (
    <section className="gvp-coupon" aria-label="Coupon">
      {totals.flashSavings > 0 && (
        <p className="gvp-offer-note" role="status">
          <Tag size={14} aria-hidden="true" /> Flash sale: you save {rupee(totals.flashSavings)}
        </p>
      )}
      {totals.offerLabel && totals.couponDiscount > 0 && (
        <p className="gvp-offer-note" role="status">
          <Tag size={14} aria-hidden="true" /> Offer applied: {totals.offerLabel} You save {rupee(totals.couponDiscount)}
        </p>
      )}
      {totals.couponCode ? (
        <div className="gvp-save is-coupon">
          <span className="gvp-save-icon" aria-hidden="true">
            <Tag size={18} />
          </span>
          <span className="gvp-save-copy">
            <b>
              {totals.couponCode} <Check size={15} aria-label="applied" />
            </b>
            <small>{totals.couponDiscount > 0 ? `You saved ${rupee(totals.couponDiscount)} on this order` : 'Applied. The saving shows once the server confirms it.'}</small>
          </span>
          <button
            type="button"
            className="gvp-icon-btn"
            onClick={() => {
              setCouponCode(null);
              showToast('Coupon removed');
            }}
            aria-label={`Remove coupon ${totals.couponCode}`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <form className="gvp-coupon-form" onSubmit={applyCoupon} noValidate>
          <label className="gvp-input">
            <Tag size={18} aria-hidden="true" />
            <input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                setCodeError(null);
              }}
              placeholder="Enter coupon code"
              aria-label="Coupon code"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? 'cart-coupon-error' : undefined}
              autoCapitalize="characters"
            />
          </label>
          <button className="gvp-btn is-soft" type="submit" disabled={applying}>
            {applying ? 'Checking…' : 'Apply'}
          </button>
          {codeError && (
            <em className="gvp-error" id="cart-coupon-error">
              {codeError}
            </em>
          )}
        </form>
      )}
    </section>
  );

  return (
    <main className="commerce-screen gvp gvp-cart has-aside">
      <PremiumHeader
        brand
        title="Your cart"
        subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}${address?.etaMinutes ? ` · Delivery in about ${address.etaMinutes} mins` : ''}`}
        onBack={goBack}
        right={
          <button type="button" className="gvp-link" aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            {editing ? 'Done' : 'Edit Cart'}
          </button>
        }
      />

      <CheckoutSteps step={1} />
      <div className="commerce-body commerce-split gvp-body">
        <div className="commerce-main">
          <AddressBlock
            address={address}
            heading="Deliver to"
            onChange={() => navigate('address-saved', { returnTo: 'cart-tab' })}
            onAdd={() => navigate('location-setup', { returnTo: 'cart-tab' })}
          />
          <FreeDeliveryCard totals={totals} threshold={FREE_DELIVERY_ABOVE} />
          <ReorderNotice items={skipped} />

          <section aria-labelledby="cart-items-title">
            <div className="gvp-section-head">
              <h2 id="cart-items-title">Items in your cart ({totals.itemCount})</h2>
              {editing && (
                <button
                  type="button"
                  className="gvp-link is-danger"
                  onClick={() => {
                    clearCart();
                    setEditing(false);
                    showToast('Cart cleared');
                  }}
                >
                  Remove all
                </button>
              )}
            </div>
            <div className="gvp-card gvp-lines">
              {cartItems.map((item) => {
                const key = lineKeyOf(item.productId, item.variantId);
                const saved = wishlist.includes(item.productId);
                return (
                  <article className="gvp-line" key={key}>
                    <Thumb src={item.image}>
                      <button
                        type="button"
                        className={`gvp-heart${saved ? ' is-on' : ''}`}
                        onClick={() => toggleWishlist(item.productId)}
                        aria-pressed={saved}
                        aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
                      >
                        <Heart size={14} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                    </Thumb>
                    <div className="gvp-line-copy">
                      {item.brand && <b className="gvp-line-brand">{item.brand}</b>}
                      <h3>{item.name}</h3>
                      {item.variantLabel && <small>{item.variantLabel}</small>}
                      <p className="gvp-line-price">
                        <b>{rupee(item.price * item.quantity)}</b>
                        {item.mrp && item.mrp > item.price && <s>{rupee(item.mrp * item.quantity)}</s>}
                        {item.quantity > 1 && <span>{rupee(item.price)} each</span>}
                      </p>
                    </div>
                    <div className="gvp-line-actions">
                      <div className="gvp-stepper">
                        <button
                          type="button"
                          onClick={() => {
                            safeHapticSelection();
                            decrementItem(key);
                          }}
                          aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Remove one ${item.name}`}
                        >
                          <Minus size={15} aria-hidden="true" />
                        </button>
                        <b aria-live="polite">{item.quantity}</b>
                        <button
                          type="button"
                          onClick={() => {
                            safeHapticSelection();
                            incrementItem(key);
                          }}
                          aria-label={`Add one ${item.name}`}
                        >
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </div>
                      <button type="button" className="gvp-icon-btn" onClick={() => removeItem(key)} aria-label={`Remove ${item.name} from cart`}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="commerce-aside">
          <section className="gvp-card gvp-summary" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title" className="gvp-sr">
              Price details
            </h2>
            <PriceSummary totals={totals} note={!address ? 'Delivery charge is confirmed once you add your address.' : undefined}>
              {couponBlock}
              <HelpRow onClick={() => navigate('profile-support')} />
            </PriceSummary>
            <button type="button" className="gvp-btn is-block commerce-aside-cta" onClick={checkout}>
              Proceed to Checkout <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar gvp-bar">
        <button type="button" className="gvp-btn is-block" onClick={checkout}>
          Proceed to Checkout · {rupee(totals.grandTotal)} <ChevronRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
};
