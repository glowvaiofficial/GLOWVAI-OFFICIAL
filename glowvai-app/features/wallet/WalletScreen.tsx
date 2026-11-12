import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, ReceiptText } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  fetchTopupStatus,
  fetchWallet,
  fetchWalletHistory,
  reportTopupFailed,
  startTopup,
  verifyTopup,
  type WalletHistoryRow,
  type WalletSummary,
} from '../../core/services/walletApi';
import { ProfileHeader } from '../profile/ProfileShared';
import { openWalletCheckout, type CheckoutOutcome } from './walletCheckout';
import './wallet.css';

type Tone = 'ok' | 'info' | 'error';
interface Notice {
  tone: Tone;
  text: string;
}

const dateLabel = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// The amount the customer typed or picked: a whole number of rupees inside the server's bounds (checked again on the server).
function readAmount(text: string, presetRupees: number | null, limits: { minRupees: number; maxRupees: number }): { rupees: number } | { error: string } | null {
  const raw = text.trim();
  if (raw === '') return presetRupees === null ? null : { rupees: presetRupees };
  if (!/^\d{1,9}$/.test(raw)) return { error: `Enter a whole number of rupees from ${inr(limits.minRupees)} to ${inr(limits.maxRupees)}.` };
  const rupees = Number(raw);
  if (rupees < limits.minRupees || rupees > limits.maxRupees) {
    return { error: `Enter a whole number of rupees from ${inr(limits.minRupees)} to ${inr(limits.maxRupees)}.` };
  }
  return { rupees };
}

export const WalletScreen = () => {
  const { goBack } = useApp();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<WalletHistoryRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingTopupId, setPendingTopupId] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    const result = await fetchWallet();
    if (result.ok && result.data) {
      setWallet(result.data.wallet);
      setHistory(result.data.history);
      setCursor(result.data.nextCursor);
      setLoadError(null);
    } else {
      setLoadError(result.error || 'Your wallet could not be loaded. Try again in a moment.');
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const limits = wallet?.limits ?? null;
  const parsed = useMemo(() => (limits ? readAmount(custom, preset, limits) : null), [custom, preset, limits]);
  const amount = parsed && 'rupees' in parsed ? parsed.rupees : null;
  const coinsPerRupee = wallet?.rate.coinsPerRupee ?? 1;
  const coins = amount === null ? 0 : amount * coinsPerRupee;

  // Why the Pay button is off, in the customer's words. The server enforces the same rules.
  const blocked = useMemo<string | null>(() => {
    if (!wallet || !limits) return null;
    if (parsed && 'error' in parsed) return parsed.error;
    if (amount === null) return null;
    if (limits.dailyCapRemainingRupees <= 0) {
      return `You have reached today's top-up limit of ${inr(limits.dailyCapRupees)}. You can add more tomorrow.`;
    }
    if (amount > limits.dailyCapRemainingRupees) {
      return `Today's limit leaves ${inr(limits.dailyCapRemainingRupees)}. Choose a smaller amount.`;
    }
    if (wallet.balance + coins > limits.maxBalanceCoins) {
      return `Your wallet can hold up to ${limits.maxBalanceCoins.toLocaleString('en-IN')} Glow Coins.`;
    }
    return null;
  }, [wallet, limits, parsed, amount, coins]);

  const pickPreset = (rupees: number) => {
    setPreset(rupees);
    setCustom('');
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchWalletHistory(cursor);
    setLoadingMore(false);
    if (result.ok && result.data) {
      const incoming = result.data.history;
      // A page can repeat a row that shares a timestamp with the last one; rows are de-duplicated by id.
      setHistory((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...incoming.filter((r) => !seen.has(r.id))];
      });
      setCursor(result.data.nextCursor);
    } else {
      setNotice({ tone: 'error', text: result.error || 'More activity could not be loaded. Try again.' });
    }
  };

  const checkStatus = async () => {
    if (!pendingTopupId) return;
    const result = await fetchTopupStatus(pendingTopupId);
    if (result.ok && result.data) {
      const tone: Tone = result.data.topup.status === 'PAID' ? 'ok' : result.data.topup.status === 'CREATED' ? 'info' : 'error';
      setNotice({ tone, text: result.data.topup.message });
      if (result.data.topup.status === 'PAID') void loadFirstPage();
    } else {
      setNotice({ tone: 'error', text: result.error || 'We could not check this top-up. Try again.' });
    }
  };

  const pay = async () => {
    if (busy || amount === null || blocked) return;
    setBusy(true);
    setNotice({ tone: 'info', text: 'Opening secure payment...' });
    const started = await startTopup(amount);
    if (!started.ok || !started.data) {
      setBusy(false);
      setNotice({ tone: 'error', text: started.error || 'We could not start the top-up. Please try again.' });
      return;
    }
    const topupId = started.data.topupId;
    setPendingTopupId(topupId);
    let outcome: CheckoutOutcome;
    try {
      outcome = await openWalletCheckout(started.data.payment);
    } catch (err) {
      setBusy(false);
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'The payment window could not open.' });
      return;
    }

    if (outcome.kind === 'success') {
      setNotice({ tone: 'info', text: 'Confirming your payment...' });
      const verified = await verifyTopup(outcome.response);
      if (verified.ok && verified.data?.status === 'PAID') {
        setNotice({ tone: 'ok', text: `Payment received. ${(verified.data.coins ?? started.data.coins).toLocaleString('en-IN')} Glow Coins have been added to your wallet.` });
        await loadFirstPage();
      } else if (verified.ok && verified.data?.status === 'PENDING') {
        setNotice({ tone: 'info', text: verified.data.message ?? 'Payment received. We are confirming it, and your coins will appear shortly.' });
      } else if (verified.ok && verified.data?.status === 'FAILED') {
        setNotice({ tone: 'error', text: verified.data.message ?? 'The payment failed, so no coins were added. You can try again.' });
      } else {
        setNotice({ tone: 'error', text: verified.error || 'We could not confirm the payment yet. If money was taken, your coins will be added once it is confirmed.' });
      }
    } else if (outcome.kind === 'failed') {
      await reportTopupFailed(topupId);
      setNotice({ tone: 'error', text: 'The payment failed, so no coins were added. You can try again.' });
    } else {
      setNotice({ tone: 'info', text: 'Payment not completed. No coins were added.' });
    }
    setBusy(false);
  };

  const cappedOut = limits !== null && limits.dailyCapRemainingRupees <= 0;
  const canPay = !busy && amount !== null && blocked === null && !cappedOut;

  return (
    <main className="profile-screen wallet-screen">
      <ProfileHeader title="GlowVai Coins" eyebrow="Your wallet" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
          <section className="profile-card profile-card-body wallet-balance" aria-label="Wallet balance">
            <span className="profile-card-title profile-inline-title"><Coins size={16} /> Balance</span>
            {loadError ? (
              <p className="profile-card-sub" role="alert">{loadError}</p>
            ) : wallet ? (
              <>
                <p className="wallet-balance-value" data-testid="wallet-balance">
                  {wallet.balance.toLocaleString('en-IN')} <span>Glow Coins</span>
                </p>
                <p className="profile-card-sub" data-testid="wallet-rupee-value">Worth {inr(wallet.rupeesValue)} at checkout</p>
                <p className="wallet-rate" data-testid="wallet-rate">{wallet.rate.line}</p>
              </>
            ) : (
              <p className="profile-card-sub">Loading your balance...</p>
            )}
            <p className="wallet-notice-text">
              GlowVai Coins can be used on your next order. They are not cash and cannot be withdrawn.
            </p>
          </section>

          <section className="profile-card profile-card-body wallet-topup" aria-label="Add Glow Coins">
            <p className="profile-card-title">Add Glow Coins</p>
            <div className="wallet-presets" role="group" aria-label="Quick amounts">
              {(limits?.presetsRupees ?? []).map((rupees) => (
                <button
                  key={rupees}
                  type="button"
                  className="wallet-preset"
                  aria-pressed={preset === rupees && custom.trim() === ''}
                  onClick={() => pickPreset(rupees)}
                  disabled={busy}
                >
                  {inr(rupees)}
                </button>
              ))}
            </div>
            <label className="wallet-field">
              <span>Or enter an amount</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Whole rupees"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setPreset(null);
                }}
                disabled={busy}
                aria-invalid={parsed !== null && 'error' in parsed}
                aria-describedby="wallet-amount-hint"
              />
            </label>
            <p id="wallet-amount-hint" className="wallet-hint" data-testid="wallet-amount-hint">
              {amount !== null
                ? `${inr(amount)} gives you ${coins.toLocaleString('en-IN')} Glow Coins`
                : limits
                  ? `Choose ${inr(limits.minRupees)} to ${inr(limits.maxRupees)}. ${wallet?.rate.line ?? ''}.`
                  : ''}
            </p>
            {limits && (
              <p className="wallet-hint" data-testid="wallet-daily-cap">
                You can add up to {inr(limits.dailyCapRupees)} a day. {inr(limits.dailyCapRemainingRupees)} left today.
              </p>
            )}
            {blocked && <p className="wallet-blocked" role="alert">{blocked}</p>}
            <button type="button" className="profile-button wallet-pay" onClick={pay} disabled={!canPay} data-testid="wallet-pay">
              {amount !== null ? `Pay ${inr(amount)}` : 'Pay'}
            </button>
            {notice && (
              <p
                className={`wallet-notice wallet-notice-${notice.tone}`}
                role={notice.tone === 'error' ? 'alert' : 'status'}
                aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
                data-testid="wallet-notice"
                data-tone={notice.tone}
              >
                {notice.text}
              </p>
            )}
            {notice?.tone === 'info' && pendingTopupId && !busy && (
              <button type="button" className="profile-button is-outline is-small" onClick={checkStatus}>
                Check this top-up
              </button>
            )}
          </section>
        </div>

        <div className="profile-main">
          <p className="profile-label">Wallet activity</p>
          <section className="profile-card" aria-label="Wallet activity">
            {history.length === 0 ? (
              <div className="profile-empty-row">
                <span className="profile-list-icon"><ReceiptText size={24} /></span>
                <span className="profile-list-copy">
                  <span className="profile-list-title">No activity yet</span>
                  <span className="profile-list-note">Glow Coins you add or use will be listed here.</span>
                </span>
              </div>
            ) : (
              <ul className="profile-list" aria-label="Wallet history" data-testid="wallet-history">
                {history.map((row) => (
                  <li key={row.id} className="profile-list-item" data-testid="wallet-history-row">
                    <span className="profile-list-copy">
                      <span className="profile-list-title">{row.label}</span>
                      <span className="profile-list-note">
                        {dateLabel(row.createdAt)}
                        {row.reason ? ` · ${row.reason}` : ''}
                      </span>
                    </span>
                    <span className={`profile-stat-value wallet-amount-${row.signed < 0 ? 'out' : 'in'}`}>
                      {row.signed < 0 ? '−' : '+'}
                      {Math.abs(row.signed).toLocaleString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {cursor && (
              <button type="button" className="profile-button is-outline is-small wallet-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
