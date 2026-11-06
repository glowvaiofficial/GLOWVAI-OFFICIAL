import { useEffect, useState } from 'react';
import { Coins, ReceiptText } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { fetchCoins, type CoinHistoryEntry, type CoinsView } from '../../core/services/shopApi';
import { ProfileHeader } from './ProfileShared';

const SOURCE_LABEL: Record<string, string> = {
  REFERRAL_REFEREE: 'Welcome reward (referral)',
  REFERRAL_REFERRER: 'Referral reward',
  ADMIN_ADJUSTMENT: 'Adjustment by GlowVai',
  CHECKOUT_REDEMPTION: 'Used at checkout',
  EXPIRY: 'Expired',
};

const dateLabel = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

// Glow Coins balance and history, as the shop's ledger holds them. Each line is one ledger entry.
export const ReferralTransactionsScreen = () => {
  const { goBack } = useApp();
  const [coins, setCoins] = useState<CoinsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchCoins();
      if (cancelled) return;
      if (result.ok && result.data) setCoins(result.data.coins);
      else setError(result.error || 'Your coin activity could not be loaded.');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const history: CoinHistoryEntry[] = coins?.history ?? [];

  return (
    <main className="profile-screen">
      <ProfileHeader title="Glow Coins activity" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
          <section className="profile-card profile-card-body">
            <div className="profile-stat-row">
              <span className="profile-card-title profile-inline-title"><Coins size={16} />Glow Coins balance</span>
              <span className="profile-stat-value">{coins ? coins.balance.toLocaleString('en-IN') : '-'}</span>
            </div>
            <p className="profile-card-sub">
              {error ? error : coins ? 'Coins are added and used through the shop only. This balance is the sum of the activity listed.' : 'Loading your balance...'}
            </p>
          </section>
        </div>

        <div className="profile-main">
          <p className="profile-label">Coin activity</p>
          <section className="profile-card">
            {history.length === 0 ? (
              <div className="profile-empty-row">
                <span className="profile-list-icon"><ReceiptText size={24} /></span>
                <span className="profile-list-copy">
                  <span className="profile-list-title">No activity yet</span>
                  <span className="profile-list-note">Coins you earn or use will be listed here.</span>
                </span>
              </div>
            ) : (
              <ul className="profile-list" aria-label="Glow Coins history">
                {history.map((e) => (
                  <li key={e.id} className="profile-list-item">
                    <span className="profile-list-copy">
                      <span className="profile-list-title">{SOURCE_LABEL[e.source] ?? 'Glow Coins'}</span>
                      <span className="profile-list-note">
                        {dateLabel(e.createdAt)}
                        {e.reason ? ` · ${e.reason}` : ''}
                      </span>
                    </span>
                    <span className="profile-stat-value">
                      {e.type === 'CREDIT' ? '+' : '-'}
                      {e.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
