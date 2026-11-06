import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { previewCoinRedemption, type CoinPreview } from '../../core/services/shopApi';
import { useCheckoutSession } from './lib/checkoutSession';

// Glow Coins at checkout. The balance and the most that may be used come from the shop server (redeem-preview), which
// prices the bag itself. Choosing coins only sets the amount the order request asks for: the server checks the cap and
// the balance again when the order is placed, and the order shows what was actually used.
export const CoinsRedeemCard = ({ items }: { items: Array<{ productId: string; quantity: number }> }) => {
  const coinsToRedeem = useCheckoutSession((s) => s.coinsToRedeem);
  const setCoinsToRedeem = useCheckoutSession((s) => s.setCoinsToRedeem);
  const [preview, setPreview] = useState<CoinPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const bagKey = items.map((i) => `${i.productId}:${i.quantity}`).join('|');

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    setLoading(true);
    void previewCoinRedemption(items.map((i) => ({ productId: i.productId, quantity: i.quantity }))).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (r.ok && r.data) {
        setPreview(r.data.preview);
        // A smaller bag can lower the cap: never keep a choice above it.
        if (useCheckoutSession.getState().coinsToRedeem > r.data.preview.maxCoins) setCoinsToRedeem(r.data.preview.maxCoins);
      } else {
        setPreview(null);
        setCoinsToRedeem(0);
      }
    });
    return () => {
      cancelled = true;
    };
    // The bag is compared by its key, so a new array with the same lines does not fetch again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bagKey]);

  if (loading && !preview) return <p style={{ margin: '12px 0' }}>Checking your Glow Coins...</p>;
  if (!preview || preview.balance === 0) return null;
  if (preview.maxCoins === 0) {
    return (
      <p style={{ margin: '12px 0' }}>
        <Coins size={14} /> You have {preview.balance} Glow Coins. They can be used on items up to {preview.capPercent}% of the item total.
      </p>
    );
  }

  const using = coinsToRedeem > 0;
  return (
    <section style={{ margin: '12px 0' }} aria-label="Glow Coins">
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={using} onChange={(e) => setCoinsToRedeem(e.target.checked ? preview.maxCoins : 0)} />
        <span>
          <b>
            <Coins size={14} /> Use {preview.maxCoins} Glow Coins (₹{preview.maxDiscount} off)
          </b>
          <small style={{ display: 'block' }}>
            You have {preview.balance} Glow Coins. Up to {preview.capPercent}% of the item total. Your final total is confirmed when the order is placed.
          </small>
        </span>
      </label>
    </section>
  );
};
