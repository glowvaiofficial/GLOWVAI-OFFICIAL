import { useEffect, useState } from 'react';
import { Check, ChevronRight, Coins, Copy, ExternalLink, GraduationCap, MessageSquare, Share2, Users } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { copyText, getReferralCode, openExternal, ProfileHeader } from './ProfileShared';

const SHOP_URL = 'https://glowvai.in/shop';
// The partner and campus referral programme runs on the glowvai.in referral page, which has its own sign-up and terms.
const REFERRAL_PAGE_URL = '/referral';
const SHARE_MESSAGE = `I shop my skincare on GlowVai. Have a look: ${SHOP_URL}`;

export const ReferralHubScreen = () => {
  const { user, goBack, navigate, showToast } = useApp();
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  // Glow Coins and referral rewards are not wired to an account yet, so no balance or reward amount is shown.
  const referralCode = user?.id ? getReferralCode(user.id) : null;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (kind: 'link' | 'code', text: string) => {
    const ok = await copyText(text);
    if (ok) setCopied(kind);
    else showToast('Could not copy. Select the text and copy it manually.');
  };

  const handleShareWhatsApp = () => {
    openExternal(`https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`);
  };

  const handleShareElsewhere = async () => {
    if (!navigator.share) {
      const ok = await copyText(SHARE_MESSAGE);
      showToast(ok ? 'Message copied' : 'Sharing is not available on this browser');
      return;
    }
    try {
      await navigator.share({ text: SHARE_MESSAGE });
    } catch {
      // user cancelled the share sheet
    }
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Refer friends" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-hero">
          <span className="profile-hero-kicker">GLOWVAI REFERRALS</span>
          <h2 className="profile-hero-title">Share GlowVai with friends</h2>
          <p className="profile-hero-sub">
            Rewards for referrals are coming soon. Until then, you can share the shop with friends who would like it.
          </p>
        </section>

        <section className="profile-card profile-card-body">
          <div className="profile-stat-row">
            <span className="profile-card-title profile-title-icon"><Coins size={16} /> Glow Coins</span>
            <span className="profile-pill is-muted">Not available yet</span>
          </div>
          <p className="profile-card-sub">Your coin balance will show here once referral rewards are live.</p>
        </section>
        </div>

        <div className="profile-main">
        <p className="profile-label">Share the shop</p>
        <section className="profile-card profile-card-body">
          <div className="profile-code-row">
            <span className="profile-code-text">glowvai.in/shop</span>
            <button type="button" className="profile-button is-primary is-small" onClick={() => handleCopy('link', SHOP_URL)}>
              {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'link' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="profile-button-row">
            <button type="button" className="profile-button is-primary" onClick={handleShareWhatsApp}>
              <MessageSquare size={16} />
              WhatsApp
            </button>
            <button type="button" className="profile-button is-outline" onClick={handleShareElsewhere}>
              <Share2 size={16} />
              Share
            </button>
          </div>
          {referralCode ? (
            <>
              <div className="profile-divider" />
              <div className="profile-field">
                <span className="profile-field-label">Your referral code</span>
                <div className="profile-code-row">
                  <span className="profile-code-text">{referralCode}</span>
                  <button type="button" className="profile-button is-outline is-small" onClick={() => handleCopy('code', referralCode)}>
                    {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="profile-field-hint">Keep this code handy. Referral rewards are not live yet.</span>
              </div>
            </>
          ) : (
            <p className="profile-field-hint">Sign in to see your referral code.</p>
          )}
        </section>

        <p className="profile-label">Students and partners</p>
        <section className="profile-card">
          <a className="profile-list-item" href={REFERRAL_PAGE_URL} target="_blank" rel="noopener noreferrer">
            <span className="profile-list-icon"><Users size={18} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">GlowVai referral programme</span>
              <span className="profile-list-note">Campus ambassadors and partners sign up here. Terms and payouts are listed on the page.</span>
            </span>
            <ExternalLink size={16} className="profile-chevron" />
          </a>
          <button type="button" className="profile-list-item" onClick={() => navigate('profile-referral-code')}>
            <span className="profile-list-icon"><GraduationCap size={18} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">Student verification</span>
              <span className="profile-list-note">How student sign-up works</span>
            </span>
            <ChevronRight size={18} className="profile-chevron" />
          </button>
        </section>

        <p className="profile-label">Referral history</p>
        <section className="profile-card">
          <p className="profile-empty">Referral tracking is not live yet. Friends who join will show up here once it is.</p>
        </section>
        </div>
      </div>
    </main>
  );
};
