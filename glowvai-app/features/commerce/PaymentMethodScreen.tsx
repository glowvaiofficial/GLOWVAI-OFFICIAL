import React, { useEffect, useState } from 'react';
import { BadgeCheck, Banknote, ChevronDown, ChevronUp, CreditCard, Ellipsis, Landmark, MapPin, ShieldCheck, ShoppingBag, UserRound, Wallet, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { safeHapticImpact, safeHapticSelection } from '../../core/utils/haptics';
import { fetchShopConfig } from '../../core/services/shopApi';
import { computeCartTotals } from './lib/pricing';
import { useCheckoutSession } from './lib/checkoutSession';
import { SUBSTITUTION_OPTIONS } from '../../core/services/shopTracking';
import { formatAddressForDisplay } from './lib/displayText';
import { NETBANKING_BANKS, UPI_APPS, choiceSummary, payButtonLabel, sameChoice, type NetbankingBank, type PaymentChoice, type UpiAppId } from './lib/paymentChoice';
import { useDeliveryAddress } from './components/shared';
import { EmptyState, CheckoutSteps, PremiumHeader, PriceSummary, SecureNote, rupee } from './components/premium';

const TIP_OPTIONS = [0, 10, 20, 30];

// App and bank marks are drawn as text monograms: the shop ships no third-party logo files.
const APP_MARKS: Record<UpiAppId, { glyph: string; bg: string; fg: string }> = {
  gpay: { glyph: 'G', bg: '#E8F0FE', fg: '#1A73E8' },
  phonepe: { glyph: 'Pe', bg: '#5F259F', fg: '#FFFFFF' },
  paytm: { glyph: 'Paytm', bg: '#E6F7FD', fg: '#002E6E' },
  cred: { glyph: 'C', bg: '#111111', fg: '#FFFFFF' },
};

const BANK_MARKS: Record<NetbankingBank, { glyph: string; fg: string; bg: string }> = {
  HDFC: { glyph: 'HDFC', fg: '#004C8F', bg: '#E8F0F8' },
  SBIN: { glyph: 'SBI', fg: '#22409A', bg: '#E9EDF8' },
  ICIC: { glyph: 'ICICI', fg: '#AE282E', bg: '#FBEDEE' },
  UTIB: { glyph: 'AXIS', fg: '#97144D', bg: '#F7E9EF' },
};

const Radio: React.FC<{ on: boolean }> = ({ on }) => <span className={`gvp-radio${on ? ' is-on' : ''}`} aria-hidden="true" />;

// Step 3 of checkout: how to pay. Every online option is paid in the Razorpay window, opened on that method (the
// customer can still switch there); GlowVai never sees card, bank or UPI details. Cash on delivery places the order on
// the processing screen. Tip, substitution choice and the order summary are unchanged.
export const PaymentMethodScreen: React.FC = () => {
  const { navigate, goBack, customerDetails } = useApp();
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const bagQuote = useCheckoutSession((s) => s.bagQuote);
  const address = useDeliveryAddress();
  const addressConfirmed = useCheckoutSession((s) => s.addressConfirmed);
  const choice = useCheckoutSession((s) => s.paymentChoice);
  const setChoice = useCheckoutSession((s) => s.setPaymentChoice);
  const tip = useCheckoutSession((s) => s.tip);
  const setTip = useCheckoutSession((s) => s.setTip);
  const substitutionPreference = useCheckoutSession((s) => s.substitutionPreference);
  const setSubstitutionPreference = useCheckoutSession((s) => s.setSubstitutionPreference);
  const [confirming, setConfirming] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(choice.kind === 'card');
  // Turning cash on delivery off returns to the last online option the customer picked.
  const [lastOnline, setLastOnline] = useState<PaymentChoice>(choice.kind === 'cod' ? { kind: 'upi', app: null } : choice);
  // EMI is shown only when the server reports it on (RAZORPAY_EMI_ENABLED). Until then, or if the check fails, it is not claimed.
  const [emiAvailable, setEmiAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetchShopConfig().then((r) => {
      if (!cancelled) setEmiAvailable(r.ok && r.data?.payments?.emi?.available === true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cartItems = Object.values(items);

  // Payment needs a cart and a deliverable address; otherwise send the customer back to the step that is missing.
  if (cartItems.length === 0 || !address?.serviceable) {
    const noItems = cartItems.length === 0;
    return (
      <main className="commerce-screen gvp gvp-payment is-empty">
        <PremiumHeader title="Payment" onBack={goBack} />
        <div className="commerce-body gvp-body">
          <EmptyState
            Icon={noItems ? ShoppingBag : MapPin}
            title={noItems ? 'Your cart is empty' : 'Add a delivery address first'}
            body={noItems ? 'Add a product before you pay.' : 'We need a Vijayawada address (520xxx pincode) before you can pay.'}
            action={noItems ? 'Start shopping' : 'Back to delivery details'}
            onAction={() => navigate(noItems ? 'home' : 'checkout-review')}
          />
        </div>
      </main>
    );
  }

  const totals = computeCartTotals(cartItems, couponCode, address.fullAddress, bagQuote);
  const online = choice.kind !== 'cod';
  const payable = totals.grandTotal + tip;
  const displayAddress = formatAddressForDisplay(address.fullAddress);
  const summary = choiceSummary(choice);

  const pick = (next: PaymentChoice) => {
    safeHapticSelection();
    setChoice(next);
    if (next.kind !== 'cod') setLastOnline(next);
  };
  const selected = (c: PaymentChoice) => sameChoice(choice, c);

  const placeOrder = () => {
    safeHapticImpact();
    // The order is linked to the customer's saved details, so ask for them first.
    if (!customerDetails) {
      navigate('customer-details', { returnTo: 'checkout-payment-method', name: address.recipientName, phone: address.phoneNumber });
      return;
    }
    // The address must be confirmed on the delivery details step first, so the customer always sees where the order goes.
    if (!addressConfirmed) {
      navigate('checkout-review');
      return;
    }
    setConfirming(true);
  };

  // The customer confirmed the order in the dialog: go to the processing screen, which places it once.
  const confirmPlace = () => {
    setConfirming(false);
    useCheckoutSession.getState().setPlacement('idle');
    navigate('checkout-payment-processing', { method: online ? 'online' : 'cod' });
  };

  const ctaLabel = !customerDetails ? 'Add your details to continue' : !addressConfirmed ? 'Confirm delivery address' : payButtonLabel(choice, payable);

  const option = (c: PaymentChoice, label: string, children: React.ReactNode, className: string) => {
    const on = selected(c);
    return (
      <button type="button" role="radio" aria-checked={on} aria-label={label} className={`${className}${on ? ' is-on' : ''}`} onClick={() => pick(c)}>
        {children}
      </button>
    );
  };

  return (
    <main className="commerce-screen gvp gvp-payment has-aside">
      <PremiumHeader
        title="Payment"
        subtitle={`Delivering to ${address.label} · ${address.pincode}`}
        onBack={goBack}
        right={
          <span className="gvp-head-total" aria-label={`Total payable ${rupee(payable)}`}>
            <b>{rupee(payable)}</b>
            <small>Total payable</small>
          </span>
        }
      />

      <CheckoutSteps step={3} />
      <div className="commerce-body commerce-split gvp-body">
        <div className="commerce-main">
          {!addressConfirmed && (
            <section className="gvp-card gvp-confirm-address" role="alert">
              <MapPin size={18} aria-hidden="true" />
              <div>
                <b>Confirm your delivery address</b>
                <p>{displayAddress}</p>
              </div>
              <button type="button" className="gvp-link" onClick={() => navigate('checkout-review')}>
                Review
              </button>
            </section>
          )}

          <div className="gvp-pay" role="radiogroup" aria-label="Payment option">
            <div className="gvp-section-head">
              <h2>Recommended for you</h2>
              <span className="gvp-pill is-green">Fastest</span>
            </div>
            {option(
              { kind: 'upi', app: null },
              'UPI. Pay instantly with any UPI app',
              <>
                <span className="gvp-reco-icon" aria-hidden="true">
                  <Zap size={24} fill="currentColor" />
                </span>
                <span className="gvp-reco-copy">
                  <b>
                    UPI <BadgeCheck size={16} aria-hidden="true" />
                  </b>
                  <span>Instant | Safe | Reliable</span>
                  <small>Pay with any UPI app for a faster checkout.</small>
                </span>
                <Radio on={selected({ kind: 'upi', app: null })} />
              </>,
              'gvp-card gvp-reco'
            )}

            <div className="gvp-section-head">
              <h2>Other UPI apps</h2>
            </div>
            <div className="gvp-app-grid">
              {UPI_APPS.map((app) => {
                const mark = APP_MARKS[app.id];
                return (
                  <React.Fragment key={app.id}>
                    {option(
                      { kind: 'upi', app: app.id },
                      `${app.name} UPI`,
                      <>
                        <span className="gvp-mark" style={{ background: mark.bg, color: mark.fg }} aria-hidden="true">
                          <span className={mark.glyph.length > 2 ? 'is-long' : undefined}>{mark.glyph}</span>
                        </span>
                        <b>{app.name}</b>
                        <small>UPI</small>
                      </>,
                      'gvp-app-tile'
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <p className="gvp-caption">You pick the UPI app in the secure Razorpay window that opens next.</p>

            <section className="gvp-card gvp-pay-section">
              <button type="button" className="gvp-pay-section-head" onClick={() => setCardsOpen((v) => !v)} aria-expanded={cardsOpen} aria-controls="gvp-cards-body">
                <CreditCard size={26} aria-hidden="true" />
                <span>
                  <b>Cards</b>
                  <small>Pay with a credit or debit card</small>
                </span>
                {cardsOpen ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
              </button>
              {cardsOpen && (
                <div className="gvp-cards-body" id="gvp-cards-body">
                  <p className="gvp-networks" aria-label="Visa, Mastercard and RuPay cards accepted">
                    <span className="is-visa">VISA</span>
                    <span className="is-mc">Mastercard</span>
                    <span className="is-rupay">RuPay</span>
                    {emiAvailable && <span className="gvp-pill is-green">EMI on eligible cards</span>}
                  </p>
                  {option(
                    { kind: 'card' },
                    'Pay with a new card',
                    <>
                      <span className="gvp-dashed" aria-hidden="true">
                        +
                      </span>
                      <span className="gvp-row-copy">
                        <b>Add new card</b>
                        <small>Credit / Debit / RuPay</small>
                      </span>
                      <Radio on={selected({ kind: 'card' })} />
                    </>,
                    'gvp-option-row'
                  )}
                </div>
              )}
            </section>

            <section className="gvp-card gvp-pay-section">
              <div className="gvp-pay-section-head is-static">
                <Landmark size={26} aria-hidden="true" />
                <span>
                  <b>Netbanking</b>
                  <small>Pay securely from your bank account</small>
                </span>
              </div>
              <div className="gvp-bank-grid">
                {NETBANKING_BANKS.map((bank) => {
                  const mark = BANK_MARKS[bank.code];
                  return (
                    <React.Fragment key={bank.code}>
                      {option(
                        { kind: 'netbanking', bank: bank.code },
                        `${bank.name} netbanking`,
                        <>
                          <span className="gvp-mark is-bank" style={{ background: mark.bg, color: mark.fg }} aria-hidden="true">
                            <span className="is-long">{mark.glyph}</span>
                          </span>
                          <small>{bank.name}</small>
                        </>,
                        'gvp-bank-tile'
                      )}
                    </React.Fragment>
                  );
                })}
                {option(
                  { kind: 'netbanking', bank: null },
                  'More banks',
                  <>
                    <span className="gvp-mark" style={{ background: '#EAF1FF', color: '#0057FB' }} aria-hidden="true">
                      <Ellipsis size={18} />
                    </span>
                    <small>More Banks</small>
                  </>,
                  'gvp-bank-tile'
                )}
              </div>
            </section>

            {option(
              { kind: 'more' },
              'Wallets and pay later. Choose in the secure payment window',
              <>
                <Wallet size={26} aria-hidden="true" />
                <span className="gvp-row-copy">
                  <b>Wallets &amp; Pay Later</b>
                  <small>Pay with a wallet or buy now, pay later in the secure Razorpay window</small>
                </span>
                <Radio on={selected({ kind: 'more' })} />
              </>,
              'gvp-card gvp-option-row is-card'
            )}

            <section className="gvp-card gvp-pay-section">
              <div className="gvp-pay-section-head is-static">
                <Banknote size={26} aria-hidden="true" />
                <span>
                  <b>Cash on delivery</b>
                  <small>Pay in cash or UPI to the delivery partner when your order arrives</small>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!online}
                  aria-label="Cash on delivery"
                  className={`gvp-switch${!online ? ' is-on' : ''}`}
                  onClick={() => pick(online ? { kind: 'cod' } : lastOnline)}
                >
                  <span />
                </button>
              </div>
              <SecureNote />
            </section>
          </div>

          <fieldset className="gvp-card gvp-fieldset">
            <legend>If an item is unavailable</legend>
            <div className="gvp-choice-list">
              {SUBSTITUTION_OPTIONS.map((opt) => (
                <label key={opt.id} className={`gvp-choice${substitutionPreference === opt.id ? ' is-on' : ''}`}>
                  <input type="radio" name="substitution-choice" checked={substitutionPreference === opt.id} onChange={() => setSubstitutionPreference(opt.id)} />
                  <span>
                    <b>{opt.label}</b>
                    <small>{opt.hint}</small>
                  </span>
                </label>
              ))}
            </div>
            <small className="gvp-muted">You can change this on the order page until the order is packed.</small>
          </fieldset>

          {customerDetails ? (
            <section className="gvp-card gvp-details">
              <UserRound size={20} aria-hidden="true" />
              <div>
                <b>{customerDetails.fullName}</b>
                <p>+91 {customerDetails.phoneNumber}</p>
              </div>
              <button type="button" className="gvp-link" onClick={() => navigate('customer-details', { returnTo: 'checkout-payment-method' })}>
                Edit
              </button>
            </section>
          ) : null}
        </div>

        <aside className="commerce-aside">
          <section className="gvp-card gvp-tip" aria-labelledby="tip-title">
            <h2 id="tip-title">Tip your delivery partner</h2>
            <p className="gvp-muted">Optional. 100% goes to the delivery partner who brings your order.</p>
            <div className="gvp-tip-options" role="radiogroup" aria-label="Tip amount">
              {TIP_OPTIONS.map((amount) => (
                <button key={amount} type="button" role="radio" aria-checked={tip === amount} className={`gvp-tip-chip${tip === amount ? ' is-on' : ''}`} onClick={() => setTip(amount)}>
                  {amount === 0 ? 'No tip' : `₹${amount}`}
                </button>
              ))}
            </div>
          </section>

          <section className="gvp-card gvp-summary" aria-labelledby="pay-summary-title">
            <h2 id="pay-summary-title" className="gvp-summary-title">
              Order Summary
            </h2>
            <PriceSummary totals={totals} tip={tip} totalLabel={online ? 'Total to pay now' : 'Pay on delivery'} />
            <div className="gvp-summary-pay">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                <b>{summary.title}</b>
                <small>{online ? 'Processed by Razorpay. The order is placed once the payment is confirmed.' : 'You pay the delivery partner when the order arrives.'}</small>
              </span>
            </div>
            <button type="button" className="gvp-btn is-block commerce-aside-cta" onClick={placeOrder}>
              <ShieldCheck size={18} aria-hidden="true" /> {ctaLabel}
            </button>
          </section>
        </aside>
      </div>

      <footer className="commerce-sticky-bar gvp-bar">
        <button type="button" className="gvp-btn is-block" onClick={placeOrder}>
          <ShieldCheck size={18} aria-hidden="true" /> {ctaLabel}
        </button>
      </footer>

      {confirming ? (
        <div className="commerce-confirm-backdrop gvp-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-order-title">
          <div className="commerce-confirm-sheet">
            <h2 id="confirm-order-title">Confirm your order</h2>
            <p>
              {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} to {displayAddress}, {address.city} {address.pincode}
            </p>
            <p>
              {online ? `You pay now with ${summary.title} in the secure Razorpay window.` : 'You pay the delivery partner when the order arrives.'}
              {tip > 0 ? ` Includes a ₹${tip} tip for your delivery partner.` : ''}
            </p>
            <p className="commerce-confirm-total">Total {rupee(payable)}</p>
            <div className="commerce-confirm-actions">
              <button type="button" className="gvp-btn is-ghost" onClick={() => setConfirming(false)}>
                Edit order
              </button>
              <button type="button" className="gvp-btn" onClick={confirmPlace} autoFocus>
                {online ? 'Confirm and pay' : 'Confirm and place'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};
