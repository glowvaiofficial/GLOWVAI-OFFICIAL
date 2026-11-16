import React from 'react';
import { ArrowRight, Bike, Banknote, ChevronRight, CreditCard, Headset, KeyRound, Landmark, MapPinned, ShoppingBag, Smartphone, Wallet, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { lineKeyOf } from '../../../lib/shop/variants';
import { safeHapticImpact } from '../../core/utils/haptics';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { choiceSummary, type PaymentChoice } from './lib/paymentChoice';
import { useDeliveryAddress } from './components/shared';
import { AddressBlock, EmptyState, CheckoutSteps, PremiumHeader, PriceSummary, SavingsBanner, Thumb, rupee } from './components/premium';
import { DeliverySlotPicker } from './components/DeliverySlotPicker';
import { ShareLocationOption } from './components/ShareLocationOption';
import { CoinsRedeemCard } from './CoinsRedeemCard';

const CHOICE_ICON: Record<PaymentChoice['kind'], LucideIcon> = {
  cod: Banknote,
  upi: Smartphone,
  card: CreditCard,
  netbanking: Landmark,
  more: Wallet,
};

// What the delivery service really offers on every order (no claims the shop cannot back).
const PROMISES: { Icon: LucideIcon; label: string }[] = [
  { Icon: MapPinned, label: 'Live tracking' },
  { Icon: KeyRound, label: 'OTP at the door' },
  { Icon: Headset, label: 'Order support' },
];

// Step 2 of checkout, "Delivery Details": the address, when it should arrive, the delivery partner promise, how to pay,
// the items and the order summary. Back goes to the cart.
export const CheckoutReviewScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const bagQuote = useCheckoutSession((s) => s.bagQuote);
  const slotId = useCheckoutSession((s) => s.slotId);
  const paymentChoice = useCheckoutSession((s) => s.paymentChoice);
  const address = useDeliveryAddress();

  const cartItems = Object.values(items);
  const totals = computeCartTotals(cartItems, couponCode, address?.fullAddress, bagQuote);
  // A delivery time is required too: the order says when it should arrive.
  const canContinue = Boolean(address?.serviceable) && Boolean(slotId);

  if (cartItems.length === 0) {
    return (
      <main className="commerce-screen gvp gvp-review is-empty">
        <PremiumHeader title="Delivery Details" onBack={goBack} />
        <div className="commerce-body gvp-body">
          <EmptyState Icon={ShoppingBag} title="Your cart is empty" body="Add a product before you check out." action="Start shopping" onAction={goBack} />
        </div>
      </main>
    );
  }

  const next = () => {
    safeHapticImpact();
    if (!address) {
      navigate('location-setup', { returnTo: 'checkout-review' });
      return;
    }
    if (!address.serviceable) {
      navigate('address-saved', { returnTo: 'checkout-review' });
      return;
    }
    if (!slotId) return;
    // The customer confirms the delivery address shown above before paying.
    useCheckoutSession.getState().setAddressConfirmed(true);
    navigate('checkout-payment-method');
  };
  const ctaLabel = !address ? 'Add delivery address' : !address.serviceable ? 'Choose another address' : slotId ? 'Continue to Payment' : 'Choose a delivery time';
  const pay = choiceSummary(paymentChoice);
  const PayIcon = CHOICE_ICON[paymentChoice.kind];
  const etaLine = address?.etaMinutes ? `Arriving in about ${address.etaMinutes} mins` : 'Delivered from a nearby GlowVai store';

  return (
    <main className="commerce-screen gvp gvp-review has-aside">
      <PremiumHeader
        title="Delivery Details"
        subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'} · ${rupee(totals.grandTotal)}`}
        onBack={goBack}
        right={
          <button type="button" className="gvp-link" onClick={() => navigate('cart-tab')}>
            Edit cart
          </button>
        }
      />

      <CheckoutSteps step={2} />
      <div className="commerce-body commerce-split gvp-body">
        <div className="commerce-main">
          <AddressBlock
            variant="panel"
            address={address}
            heading="Delivery Address"
            onChange={() => navigate('address-saved', { returnTo: 'checkout-review' })}
            onAdd={() => navigate('location-setup', { returnTo: 'checkout-review' })}
          />

          {address?.serviceable && (
            <section aria-labelledby="review-slot-title">
              <div className="gvp-section-head">
                <h2 id="review-slot-title">When should it arrive?</h2>
              </div>
              <div className="gvp-card gvp-slots">
                <DeliverySlotPicker />
              </div>
            </section>
          )}

          {address?.serviceable && (
            <section aria-labelledby="review-partner-title">
              <div className="gvp-section-head">
                <h2 id="review-partner-title">Delivery Partner</h2>
              </div>
              <div className="gvp-card gvp-partner">
                <div className="gvp-partner-top">
                  <span className="gvp-partner-art" aria-hidden="true">
                    <Bike size={30} />
                  </span>
                  <div>
                    <b>Fast &amp; Safe Delivery</b>
                    <p className="gvp-partner-eta">
                      <Zap size={14} aria-hidden="true" fill="currentColor" /> {etaLine}
                    </p>
                  </div>
                </div>
                <ul className="gvp-promises">
                  {PROMISES.map(({ Icon, label }) => (
                    <li key={label}>
                      <Icon size={20} aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="gvp-partner-note">Your delivery partner's name and number show on the tracking page once a rider picks up your order.</p>
                <ShareLocationOption />
              </div>
            </section>
          )}

          <div className="gvp-coins">
            <CoinsRedeemCard items={cartItems} />
          </div>

          <section aria-labelledby="review-pay-title">
            <div className="gvp-section-head">
              <h2 id="review-pay-title">Payment</h2>
            </div>
            <button type="button" className="gvp-card gvp-pay-row" onClick={next} disabled={!canContinue} aria-label={`Payment: ${pay.title}. Change`}>
              <span className="gvp-pay-row-icon" aria-hidden="true">
                <PayIcon size={22} />
              </span>
              <span className="gvp-pay-row-copy">
                <b>{pay.title}</b>
                <small>{pay.subtitle}</small>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </section>

          <section aria-labelledby="review-items-title">
            <div className="gvp-section-head">
              <h2 id="review-items-title">Items ({totals.itemCount})</h2>
            </div>
            <div className="gvp-card gvp-review-items">
              {cartItems.map((item) => (
                <div className="gvp-review-line" key={lineKeyOf(item.productId, item.variantId)}>
                  <Thumb src={item.image} size="md" />
                  <div className="gvp-review-line-copy">
                    <b>{item.name}</b>
                    <small>
                      {item.brand}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ''} · Qty {item.quantity}
                    </small>
                  </div>
                  <b className="gvp-review-line-price">{rupee(item.price * item.quantity)}</b>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="commerce-aside">
          <section aria-labelledby="review-summary-title">
            <div className="gvp-section-head">
              <h2 id="review-summary-title">Order Summary</h2>
            </div>
            <div className="gvp-card gvp-summary">
              <PriceSummary totals={totals} withIcons totalLabel="Total">
                <SavingsBanner totals={totals} sub="Applied at checkout" />
              </PriceSummary>
              <button type="button" className="gvp-btn is-block commerce-aside-cta" onClick={next} disabled={Boolean(address?.serviceable) && !slotId}>
                {ctaLabel} <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar gvp-bar">
        <button type="button" className="gvp-btn is-block" onClick={next} disabled={Boolean(address?.serviceable) && !slotId}>
          {ctaLabel} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
};
