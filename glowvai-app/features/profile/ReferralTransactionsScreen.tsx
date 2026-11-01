import { Coins, ReceiptText } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from './ProfileShared';

// Glow Coins are not on the user context yet (same as ReferralHubScreen), and no ledger feed exists in the shop,
// so the balance is zero and the activity list is empty. Replace with real data once it is wired in.
const GLOW_COIN_BALANCE = 0;

export const ReferralTransactionsScreen = () => {
  const { goBack } = useApp();

  return (
    <main className="profile-screen is-narrow">
      <ProfileHeader title="Glow Coins activity" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <section className="profile-card profile-card-body">
          <div className="profile-stat-row">
            <span className="profile-card-title profile-inline-title"><Coins size={16} />Glow Coins balance</span>
            <span className="profile-stat-value">{GLOW_COIN_BALANCE.toLocaleString('en-IN')}</span>
          </div>
          <span className="profile-pill is-muted profile-status-pill">Not connected yet</span>
          <p className="profile-card-sub">
            Glow Coins are not connected to web shop accounts yet, so your balance stays at zero.
          </p>
        </section>

        <p className="profile-label">Coin activity</p>
        <section className="profile-card">
          <div className="profile-empty-row">
            <span className="profile-list-icon is-muted"><ReceiptText size={16} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">No activity yet</span>
              <span className="profile-list-note">Coins earned or used would be listed here once Glow Coins are connected.</span>
            </span>
          </div>
        </section>
      </div>
    </main>
  );
};
