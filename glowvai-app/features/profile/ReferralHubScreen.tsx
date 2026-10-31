import { useEffect, useState } from 'react';
import { Check, Coins, Copy, GraduationCap, Share2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { copyText, getReferralCode, openExternal, ProfileHeader } from './ProfileShared';

// Glow Coins are not on the NOV user context yet, so the hub shows zero until the balance is wired in.
const GLOW_COIN_BALANCE = 0;
const COIN_GOAL = 5000;
const STUDENT_PORTAL_URL = 'https://earn.glowvai.in';

export const ReferralHubScreen = () => {
  const { user, goBack, navigate, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const referralCode = getReferralCode(user?.id);
  const inviteLink = `glowvai.in/invite/${referralCode}`;
  const inviteMessage = `Join me on GlowVAI and get FLAT ₹100 off your first clinical skincare order! https://${inviteLink}`;
  const progress = Math.min(100, Math.round((GLOW_COIN_BALANCE / COIN_GOAL) * 100));

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const ok = await copyText(`https://${inviteLink}`);
    if (ok) setCopied(true);
    else showToast('Could not copy. Select the link and copy it manually.');
  };

  const handleShareWhatsApp = () => {
    openExternal(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`);
  };

  const handleShareElsewhere = async () => {
    if (!navigator.share) {
      const ok = await copyText(inviteMessage);
      showToast(ok ? 'Invite message copied' : 'Sharing is not available on this browser');
      return;
    }
    try {
      await navigator.share({ text: inviteMessage });
    } catch {
      // user cancelled the share sheet
    }
  };

  return (
    <main className="profile-screen">
      <ProfileHeader
        title="Glow rewards"
        eyebrow="Referral hub"
        onBack={goBack}
        right={<span className="profile-pill"><Sparkles size={12} />Rewards</span>}
      />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-hero">
          <span className="profile-hero-kicker">STUDENT & FRIENDS REFERRAL PROGRAM</span>
          <h2 className="profile-hero-title">Give ₹100, Get ₹100</h2>
          <p className="profile-hero-sub">
            Invite friends to GlowVAI. They get FLAT ₹100 off their first clinical order, and you earn ₹100 Glow Cash once they order.
          </p>
        </section>

        <section className="profile-card profile-card-body">
          <div className="profile-stat-row">
            <span className="profile-card-title"><Coins size={16} /> Glow Coins</span>
            <span className="profile-stat-value">{GLOW_COIN_BALANCE.toLocaleString('en-IN')}</span>
          </div>
          <div className="profile-progress" role="progressbar" aria-valuemin={0} aria-valuemax={COIN_GOAL} aria-valuenow={GLOW_COIN_BALANCE}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="profile-card-sub">{GLOW_COIN_BALANCE} / {COIN_GOAL.toLocaleString('en-IN')} coins toward your next reward (₹500)</p>
        </section>

        </div>

        <div className="profile-main">
        <p className="profile-label">Your invite link</p>
        <section className="profile-card profile-card-body">
          <div className="profile-code-row">
            <span className="profile-code-text">{inviteLink}</span>
            <button type="button" className="profile-button is-primary is-small" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="profile-button-row">
            <button type="button" className="profile-button is-primary" onClick={handleShareWhatsApp}>
              <Share2 size={16} />
              WhatsApp
            </button>
            <button type="button" className="profile-button is-outline" onClick={handleShareElsewhere}>
              <Share2 size={16} />
              Share
            </button>
          </div>
        </section>

        <section className="profile-card profile-card-body">
          <div className="profile-stat-row">
            <span className="profile-card-title"><GraduationCap size={18} /> Student verification</span>
          </div>
          <p className="profile-card-sub">Verify your student status to unlock extra Glow Coins for every successful invite.</p>
          <button type="button" className="profile-button is-secondary is-block" onClick={() => navigate('profile-referral-code')}>
            Verify student status →
          </button>
          <button type="button" className="profile-text-link" onClick={() => openExternal(STUDENT_PORTAL_URL)}>
            Open the student earn portal ↗
          </button>
        </section>

        <p className="profile-label">Referral history</p>
        <section className="profile-card">
          <p className="profile-empty">Friends who join with your link will show up here.</p>
        </section>
        </div>
      </div>
    </main>
  );
};
