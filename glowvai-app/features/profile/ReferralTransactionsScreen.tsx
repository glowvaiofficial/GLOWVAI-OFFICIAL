import { Coins } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from './ProfileShared';
import './referral-extra.css';

// Glow Coins are not on the user context yet (same as ReferralHubScreen), and no ledger feed exists in the shop,
// so the balance is zero and the activity list is empty. Replace with real data once it is wired in.
const GLOW_COIN_BALANCE = 0;

export const ReferralTransactionsScreen = () => {
  const { goBack } = useApp();

  return (
    <main className="profile-screen">
      <div className="referral-column">
        <ProfileHeader title="Glow Coins ledger" eyebrow="Referral rewards" onBack={goBack} />

        <div className="referral-body">
          <section className="profile-card profile-card-body">
            <div className="profile-stat-row">
              <span className="profile-card-title"><Coins size={16} /> Glow Coins balance</span>
              <span className="profile-stat-value">{GLOW_COIN_BALANCE.toLocaleString('en-IN')}</span>
            </div>
            <p className="profile-card-sub">
              Glow Coins are not connected to your account in this app yet, so your balance stays at zero.
            </p>
          </section>

          <p className="profile-label">Coin activity</p>
          <section className="profile-card">
            <p className="profile-empty">No transactions yet.</p>
          </section>
        </div>
      </div>
    </main>
  );
};
