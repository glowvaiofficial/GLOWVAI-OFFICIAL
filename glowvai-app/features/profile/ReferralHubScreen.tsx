import { useEffect, useState } from 'react';
import { Check, ChevronRight, Coins, Copy, ExternalLink, GraduationCap, MessageCircle, Share2, Users } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { copyText, openExternal, ProfileHeader, SHOP_SHARE_URL, STUDENT_PORTAL_URL } from './ProfileShared';

// Glow Coins and personal invite links are not connected to web shop accounts yet. The hub therefore shows a zero
// balance, shares the public shop address and points students to the earn portal. It does not promise any reward.
const GLOW_COIN_BALANCE = 0;
const SHARE_MESSAGE = `I shop for skincare on glowvai. Take a look: ${SHOP_SHARE_URL}`;

export const ReferralHubScreen = () => {
  const { goBack, navigate, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const shareLabel = SHOP_SHARE_URL.replace(/^https:\/\//, '');

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const ok = await copyText(SHOP_SHARE_URL);
    if (ok) setCopied(true);
    else showToast('Could not copy. Select the link and copy it manually.');
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
      <ProfileHeader title="Glow rewards" eyebrow="Invite friends" onBack={goBack} />

      <div className="profile-body is-rewards">
        <div className="profile-side">
          <section className="profile-offer">
            <span className="profile-offer-kicker"><Users size={13} />Share glowvai</span>
            <h2 className="profile-offer-title">Bring a friend to glowvai</h2>
            <p className="profile-offer-sub">
              Send friends the shop link so they can scan their skin and shop the same products you use.
            </p>
          </section>

          <section className="profile-card profile-card-body">
            <div className="profile-stat-row">
              <span className="profile-card-title profile-inline-title"><Coins size={16} />Glow Coins</span>
              <span className="profile-stat-value">{GLOW_COIN_BALANCE.toLocaleString('en-IN')}</span>
            </div>
            <span className="profile-pill is-muted profile-status-pill">Not connected yet</span>
            <p className="profile-card-sub">
              Glow Coins are not linked to web shop accounts yet, so sharing here does not earn coins and your balance stays at zero.
            </p>
            <button type="button" className="profile-text-link" onClick={() => navigate('profile-referral-transactions')}>
              View coin activity <ChevronRight size={16} />
            </button>
          </section>
        </div>

        <div className="profile-main">
          <p className="profile-label">Shop link</p>
          <section className="profile-card profile-card-body">
            <div className="profile-code-row">
              <span className="profile-code-text">{shareLabel}</span>
              <button type="button" className="profile-button is-primary is-small" onClick={handleCopy} aria-live="polite">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="profile-button-row">
              <button type="button" className="profile-button is-primary" onClick={handleShareWhatsApp}>
                <MessageCircle size={16} />
                WhatsApp
              </button>
              <button type="button" className="profile-button is-outline" onClick={handleShareElsewhere}>
                <Share2 size={16} />
                More options
              </button>
            </div>
          </section>

          <p className="profile-label">Students</p>
          <section className="profile-card">
            <div className="profile-list-row profile-row-top">
              <span className="profile-list-icon"><GraduationCap size={16} /></span>
              <span className="profile-list-copy">
                <span className="profile-list-title">Campus programme</span>
                <span className="profile-list-note">Student verification and campus referrals are handled on the glowvai earn portal.</span>
              </span>
            </div>
            <div className="profile-card-actions">
              <button type="button" className="profile-button is-secondary" onClick={() => openExternal(STUDENT_PORTAL_URL)}>
                Open earn portal
                <ExternalLink size={14} />
              </button>
              <button type="button" className="profile-button is-outline" onClick={() => navigate('profile-referral-code')}>
                How it works
              </button>
            </div>
          </section>

          <p className="profile-label">Referral history</p>
          <section className="profile-card">
            <div className="profile-empty-row">
              <span className="profile-list-icon is-muted"><Users size={16} /></span>
              <span className="profile-list-copy">
                <span className="profile-list-title">No referrals to show</span>
                <span className="profile-list-note">Referrals are not tracked in the web shop yet.</span>
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
