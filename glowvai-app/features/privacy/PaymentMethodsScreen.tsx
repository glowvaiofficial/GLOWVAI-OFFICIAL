import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from '../profile/ProfileShared';
import '../profile/profile.css';
import './privacy.css';
import { confirmSavedCard, fetchPaymentMethods, removeSavedMethod, setPreferredMethod, startSavingCard, type SavedMethod } from './privacyApi';
import { openCheckout } from './razorpayHandoff';

const GATE_OFF = 'Saved payment methods are not available yet.';

// Saved cards and UPI handles. GlowVai keeps only Razorpay's customer and token ids. Brand and last four digits come from
// Razorpay each time the list loads. Card entry happens on Razorpay's checkout page, never in this app.
export const PaymentMethodsScreen = () => {
  const { goBack, showToast } = useApp();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [max, setMax] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchPaymentMethods();
    if (!res.ok || !res.data) {
      setError(res.error || 'Your saved payment methods could not be loaded.');
      return;
    }
    setEnabled(res.data.enabled);
    setMethods(res.data.methods);
    setMax(res.data.max);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    setBusy('add');
    const started = await startSavingCard();
    if (!started.ok || !started.data) {
      setBusy(null);
      showToast(started.error || 'Saving a payment method could not be started.');
      return;
    }
    try {
      const payment = await openCheckout({
        key: started.data.keyId,
        orderId: started.data.orderId,
        amountPaise: started.data.amountPaise,
        currency: started.data.currency,
        description: 'Save a payment method',
        customerId: started.data.checkout.customer_id,
        save: true,
      });
      const confirmed = await confirmSavedCard(payment.razorpay_payment_id);
      showToast(confirmed.ok ? 'Payment method saved.' : confirmed.error || 'The payment method could not be confirmed.');
    } catch (err) {
      const dismissed = err instanceof Error && err.message === 'DISMISSED';
      showToast(dismissed ? 'Nothing was saved.' : 'The payment window could not open. Check your connection.');
    } finally {
      setBusy(null);
      void load();
    }
  };

  const remove = async (m: SavedMethod) => {
    setBusy(m.id);
    const res = await removeSavedMethod(m.id);
    setBusy(null);
    showToast(res.ok ? 'Removed.' : res.error || 'That could not be removed.');
    void load();
  };

  const prefer = async (m: SavedMethod) => {
    setBusy(m.id);
    const res = await setPreferredMethod(m.preferred ? null : m.id);
    setBusy(null);
    if (!res.ok) showToast(res.error || 'That could not be changed.');
    void load();
  };

  return (
    <main className="profile-screen privacy-screen">
      <ProfileHeader title="Saved payment methods" eyebrow="Privacy" onBack={goBack} />
      <div className="profile-body">
        {error && <p className="profile-notice privacy-error" role="alert">{error}</p>}

        {enabled === false && (
          <section className="profile-card profile-card-body" aria-label="Not available">
            <p className="profile-card-title" role="status">{GATE_OFF}</p>
            <p className="profile-card-sub">When this opens, you can save a card or UPI handle with Razorpay and choose one to use first.</p>
          </section>
        )}

        {enabled === true && (
          <>
            <p className="profile-label">Your saved methods</p>
            <section className="profile-card" aria-label="Saved methods">
              {methods.map((m) => (
                <div key={m.id} className="privacy-device-row">
                  <span className="profile-list-icon"><CreditCard size={18} /></span>
                  <div className="privacy-device-copy">
                    <span className="profile-list-title">
                      {m.label} {m.preferred && <span className="privacy-this-device">Preferred</span>}
                    </span>
                    <span className="profile-list-note">{m.kind === 'upi' ? 'UPI' : 'Card'} · stored by Razorpay</span>
                  </div>
                  <button type="button" className="profile-icon-button" onClick={() => prefer(m)} disabled={busy === m.id} aria-label={m.preferred ? `Stop preferring ${m.label}` : `Prefer ${m.label}`}>
                    <Star size={16} fill={m.preferred ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" className="profile-icon-button" onClick={() => remove(m)} disabled={busy === m.id} aria-label={`Remove ${m.label}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {methods.length === 0 && <p className="profile-card-sub privacy-empty">You have no saved methods.</p>}
            </section>
            <button type="button" className="profile-button is-primary is-block" onClick={add} disabled={busy !== null || methods.length >= max}>
              <Plus size={16} /> {busy === 'add' ? 'Opening Razorpay...' : 'Add a card or UPI'}
            </button>
            {methods.length >= max && <p className="profile-card-sub">You can save up to {max} methods. Remove one to add another.</p>}
            <p className="profile-card-sub">
              GlowVai does not store card numbers. Razorpay keeps the card details and returns only the brand and last four digits.
            </p>
          </>
        )}
      </div>
    </main>
  );
};
