import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, Gift } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from '../profile/ProfileShared';
import '../profile/profile.css';
import './privacy.css';
import { GIFT_LIMITS, fetchGiftCards, redeemGiftCard, startGiftPurchase, verifyGiftPurchase, type GiftCardView } from './privacyApi';
import { openCheckout } from './razorpayHandoff';

const PRESETS = [200, 500, 1000, 2000, 5000] as const;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// Gift cards: buy one for someone (the card is shown on your account and you share the code yourself: there is no email
// delivery), redeem a code into Glow coins, and see the cards you bought or redeemed. The full code is shown once after
// purchase and cannot be shown again, because GlowVai keeps only a hash of it.
export const GiftCardsScreen = () => {
  const { goBack, showToast } = useApp();
  const [cards, setCards] = useState<GiftCardView[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [issued, setIssued] = useState<{ code: string; amount: number; recipient: string } | null>(null);

  const [code, setCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<{ coins: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetchGiftCards();
    if (res.ok && res.data) {
      setCards(res.data.cards);
      setEnabled(res.data.enabled);
      setLoadError(null);
    } else {
      setLoadError(res.error || 'Your gift cards could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chosenAmount = custom.trim() ? Number(custom.trim()) : amount;

  const buy = async (e: FormEvent) => {
    e.preventDefault();
    setBuyError(null);
    if (!Number.isInteger(chosenAmount) || chosenAmount < GIFT_LIMITS.min || chosenAmount > GIFT_LIMITS.max) {
      setBuyError(`Choose a whole amount from ${rupees(GIFT_LIMITS.min)} to ${rupees(GIFT_LIMITS.max)}.`);
      return;
    }
    if (recipient.trim().length < 2) {
      setBuyError("Enter the recipient's name.");
      return;
    }
    setBuying(true);
    const started = await startGiftPurchase({ amount: chosenAmount, recipientName: recipient.trim(), message: message.trim() });
    if (!started.ok || !started.data) {
      setBuying(false);
      setBuyError(started.error || 'The gift card could not be started. Try again.');
      return;
    }
    try {
      const payment = await openCheckout({
        key: started.data.keyId,
        orderId: started.data.razorpayOrderId,
        amountPaise: started.data.amountPaise,
        currency: started.data.currency,
        description: `GlowVai gift card ${rupees(chosenAmount)}`,
      });
      const verified = await verifyGiftPurchase({ purchaseId: started.data.purchaseId, ...payment });
      if (verified.ok && verified.data?.code) {
        setIssued({ code: verified.data.code, amount: chosenAmount, recipient: recipient.trim() });
        void load();
      } else {
        setBuyError(verified.error || 'The payment could not be confirmed. If money was taken, our team will sort it out.');
      }
    } catch (err) {
      const dismissed = err instanceof Error && err.message === 'DISMISSED';
      setBuyError(dismissed ? 'The payment was not completed. No gift card was bought.' : 'The payment window could not open. Check your connection.');
    } finally {
      setBuying(false);
    }
  };

  const redeem = async (e: FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemed(null);
    if (!code.trim()) {
      setRedeemError('Enter the gift card code.');
      return;
    }
    setRedeeming(true);
    const res = await redeemGiftCard(code);
    setRedeeming(false);
    if (!res.ok || !res.data) {
      setRedeemError(res.error || 'That code could not be redeemed.');
      return;
    }
    setRedeemed({ coins: res.data.coins });
    setCode('');
    showToast(res.data.alreadyRedeemed ? 'This code was already added to your coins.' : `${res.data.coins} coins added to your account.`);
    void load();
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      showToast('Code copied.');
    } catch {
      showToast('Select the code and copy it.');
    }
  };

  return (
    <main className="profile-screen privacy-screen">
      <ProfileHeader title="Gift cards" eyebrow="GlowVai" onBack={goBack} />
      <div className="profile-body">
        {loadError && <p className="profile-notice privacy-error" role="alert">{loadError}</p>}

        <p className="profile-label">Redeem a code</p>
        <form className="profile-card profile-card-body" onSubmit={redeem} aria-label="Redeem a gift card">
          <label className="profile-label" htmlFor="gc-code">Gift card code</label>
          <input
            id="gc-code"
            className="profile-input privacy-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 24))}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
          />
          <p className="profile-card-sub">The code adds its value to your Glow coins. Coins can be used at checkout.</p>
          {redeemError && <p className="profile-card-sub privacy-error" role="alert">{redeemError}</p>}
          {redeemed && <p className="profile-card-sub" role="status">{redeemed.coins} coins were added to your account.</p>}
          <button type="submit" className="profile-button is-primary is-block" disabled={redeeming}>
            {redeeming ? 'Checking...' : 'Redeem code'}
          </button>
        </form>

        <p className="profile-label">Buy a gift card</p>
        {issued ? (
          <section className="profile-card profile-card-body" aria-label="Your new gift card">
            <span className="profile-card-title"><Gift size={16} /> Gift card ready</span>
            <p className="profile-card-sub">
              {rupees(issued.amount)} for {issued.recipient}. This is the only time the full code is shown. Save it now.
            </p>
            <p className="privacy-code-display" data-testid="gift-code">{issued.code}</p>
            <button type="button" className="profile-button is-outline is-block" onClick={copy}><Copy size={16} /> Copy code</button>
            <p className="profile-card-sub">We do not email gift cards. Share the code with the recipient yourself.</p>
            <button type="button" className="profile-button is-primary is-block" onClick={() => setIssued(null)}>Buy another</button>
          </section>
        ) : enabled ? (
          <form className="profile-card profile-card-body" onSubmit={buy} aria-label="Buy a gift card">
            <span className="profile-label">Amount</span>
            <div className="profile-button-row" role="radiogroup" aria-label="Amount">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={!custom.trim() && amount === p}
                  className={`profile-button is-small ${!custom.trim() && amount === p ? 'is-primary' : 'is-outline'}`}
                  onClick={() => {
                    setAmount(p);
                    setCustom('');
                  }}
                >
                  {rupees(p)}
                </button>
              ))}
            </div>
            <label className="profile-label" htmlFor="gc-custom">Or another amount (₹{GIFT_LIMITS.min} to ₹{GIFT_LIMITS.max.toLocaleString('en-IN')})</label>
            <input id="gc-custom" className="profile-input" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 5))} />
            <label className="profile-label" htmlFor="gc-recipient">Recipient's name</label>
            <input id="gc-recipient" className="profile-input" value={recipient} maxLength={60} onChange={(e) => setRecipient(e.target.value)} />
            <label className="profile-label" htmlFor="gc-message">Message (optional)</label>
            <textarea id="gc-message" className="profile-input" value={message} maxLength={200} rows={3} onChange={(e) => setMessage(e.target.value)} />
            <p className="profile-card-sub">Plain text, up to 200 characters.</p>
            {buyError && <p className="profile-card-sub privacy-error" role="alert">{buyError}</p>}
            <button type="submit" className="profile-button is-primary is-block" disabled={buying}>
              {buying ? 'Opening payment...' : `Pay ${rupees(Number.isFinite(chosenAmount) ? chosenAmount : 0)}`}
            </button>
            <p className="profile-card-sub">The card appears on your account. The full code is shown once after payment.</p>
          </form>
        ) : (
          <section className="profile-card profile-card-body">
            <p className="profile-card-title" role="status">Gift cards are not available yet.</p>
          </section>
        )}

        <p className="profile-label">Your gift cards</p>
        <section className="profile-card" aria-label="Your gift cards">
          {cards.map((c) => (
            <div key={c.cardId} className="privacy-device-row">
              <span className="profile-list-icon"><Gift size={18} /></span>
              <div className="privacy-device-copy">
                <span className="profile-list-title">
                  {rupees(c.amountRupees)} for {c.recipientName || 'a friend'}{' '}
                  <span className="privacy-this-device">{c.status === 'REDEEMED' ? 'Used' : 'Active'}</span>
                </span>
                <span className="profile-list-note">
                  {c.role === 'bought' ? 'Bought' : 'Redeemed'} · ending {c.lastFour}
                  {c.message ? ` · "${c.message}"` : ''}
                </span>
              </div>
            </div>
          ))}
          {cards.length === 0 && <p className="profile-card-sub privacy-empty">You have no gift cards yet.</p>}
        </section>
      </div>
    </main>
  );
};
