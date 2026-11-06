import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, Coins, Copy, Gift, Repeat, Share2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { applyReferralCode, fetchCoins, fetchReferral, type CoinsView, type ReferralView } from '../../core/services/shopApi';
import { copyText, openExternal, ProfileHeader } from './ProfileShared';

const SHOP_URL = 'https://glowvai.in/shop';
const SHARE_TEXT = (code: string | null) =>
  code
    ? `I shop my skincare on GlowVai. Use my code ${code} for Glow Coins: ${SHOP_URL}`
    : `I shop my skincare on GlowVai. Have a look: ${SHOP_URL}`;

// Referral card, coin balance and referral status. Everything shown comes from the shop server: the code, the reward
// state (REWARDED only after the reward is in the coin ledger) and the balance. Nothing is made up on the device.
export const ReferralHubScreen = () => {
  const { goBack, navigate, showToast } = useApp();
  const [referral, setReferral] = useState<ReferralView | null>(null);
  const [coins, setCoins] = useState<CoinsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [friendCode, setFriendCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([fetchReferral(), fetchCoins()]);
    if (r.ok && r.data) setReferral(r.data.referral);
    if (c.ok && c.data) setCoins(c.data.coins);
    setLoadError(r.ok && c.ok ? null : r.error || c.error || 'Your referral details could not be loaded.');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (kind: 'code' | 'link', text: string) => {
    const ok = await copyText(text);
    if (ok) setCopied(kind);
    else showToast('Could not copy. Select the text and copy it manually.');
  };

  const handleApply = async () => {
    setApplyError(null);
    setApplying(true);
    const result = await applyReferralCode(friendCode);
    setApplying(false);
    if (!result.ok) {
      setApplyError(result.error || 'The code could not be applied. Try again.');
      return;
    }
    setFriendCode('');
    showToast('Code applied. Your reward is paid when your first order is delivered.');
    void load();
  };

  const handleShareWhatsApp = () => {
    openExternal(`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT(referral?.code ?? null))}`);
  };

  const handleShareElsewhere = async () => {
    if (!navigator.share) {
      const ok = await copyText(SHARE_TEXT(referral?.code ?? null));
      showToast(ok ? 'Message copied' : 'Sharing is not available on this browser');
      return;
    }
    try {
      await navigator.share({ text: SHARE_TEXT(referral?.code ?? null) });
    } catch {
      // The customer closed the share sheet.
    }
  };

  const rewardLine = !referral
    ? ''
    : referral.rewardStatus === 'REWARDED'
      ? `Your friend's code gave you ${referral.rewardCoins} Glow Coins.`
      : referral.rewardStatus === 'PENDING'
        ? "Reward pending: it is paid when your first order is delivered."
        : 'Use a friend’s code before your first order to get Glow Coins.';

  return (
    <main className="profile-screen">
      <ProfileHeader title="Refer friends" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
          <section className="profile-hero">
            <span className="profile-hero-kicker">GLOWVAI REFERRALS</span>
            <h2 className="profile-hero-title">Share GlowVai with friends</h2>
            <p className="profile-hero-sub">
              {referral
                ? `You get ${referral.referrerCoins} Glow Coins and your friend gets ${referral.refereeCoins} when their first order is delivered.`
                : 'Your referral code appears here.'}
            </p>
          </section>

          <section className="profile-card profile-card-body" aria-live="polite">
            <div className="profile-stat-row">
              <span className="profile-card-title profile-title-icon"><Coins size={16} /> Glow Coins</span>
              <span className="profile-stat-value">{coins ? coins.balance.toLocaleString('en-IN') : '-'}</span>
            </div>
            <p className="profile-card-sub">
              {coins ? `Worth ₹${coins.balance * coins.rupeesPerCoin} at checkout, up to 20% of an order.` : 'Your balance loads from the shop.'}
            </p>
            <button type="button" className="profile-button is-outline is-small" onClick={() => navigate('profile-referral-transactions')}>
              See coin activity <ChevronRight size={14} />
            </button>
          </section>
        </div>

        <div className="profile-main">
          {loadError && <p className="profile-card-sub" role="alert">{loadError}</p>}

          <p className="profile-label">Your code</p>
          <section className="profile-card profile-card-body">
            {referral?.code ? (
              <>
                <div className="profile-code-row">
                  <span className="profile-code-text">{referral.code}</span>
                  <button type="button" className="profile-button is-primary is-small" onClick={() => handleCopy('code', referral.code ?? '')}>
                    {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </button>
                </div>
                <div className="profile-button-row">
                  <button type="button" className="profile-button is-outline is-small" onClick={() => handleCopy('link', referral.shareUrl)}>
                    {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                    {copied === 'link' ? 'Link copied' : 'Copy link'}
                  </button>
                  <button type="button" className="profile-button is-outline is-small" onClick={handleShareWhatsApp}>
                    <Share2 size={14} /> WhatsApp
                  </button>
                  <button type="button" className="profile-button is-outline is-small" onClick={handleShareElsewhere}>
                    <Gift size={14} /> Share
                  </button>
                </div>
              </>
            ) : (
              <p className="profile-card-sub">{loadError ? 'Your code is not available right now.' : 'Creating your code...'}</p>
            )}
          </section>

          <p className="profile-label">Your referral</p>
          <section className="profile-card profile-card-body">
            <p className="profile-card-sub">{rewardLine}</p>
            {referral && (
              <p className="profile-card-sub">
                {referral.referredCount === 0
                  ? 'No friends have joined with your code yet.'
                  : `${referral.referredCount} ${referral.referredCount === 1 ? 'friend has' : 'friends have'} joined with your code, ${referral.rewardedCount} rewarded.`}
              </p>
            )}
          </section>

          {referral && !referral.applied && (
            <>
              <p className="profile-label">Have a friend&apos;s code?</p>
              <section className="profile-card profile-card-body">
                <p className="profile-card-sub">Enter it before your first order. It can be used once on this account.</p>
                <div className="profile-code-row">
                  <input
                    className="profile-code-input"
                    aria-label="Friend's referral code"
                    value={friendCode}
                    maxLength={11}
                    autoCapitalize="characters"
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                    placeholder="8-character code"
                  />
                  <button type="button" className="profile-button is-primary is-small" disabled={applying || friendCode.trim().length < 8} onClick={handleApply}>
                    {applying ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {applyError && <p className="profile-card-sub" role="alert">{applyError}</p>}
              </section>
            </>
          )}

          <p className="profile-label">More</p>
          <section className="profile-card">
            <button type="button" className="profile-list-item" onClick={() => navigate('profile-subscriptions')}>
              <span className="profile-list-copy">
                <span className="profile-list-title"><Repeat size={14} /> Subscriptions</span>
                <span className="profile-list-note">Regular deliveries every 2, 4 or 8 weeks</span>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="profile-list-item" onClick={() => navigate('profile-referral-code')}>
              <span className="profile-list-copy">
                <span className="profile-list-title">Partner and campus referrals</span>
                <span className="profile-list-note">Separate programme with its own terms</span>
              </span>
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};
