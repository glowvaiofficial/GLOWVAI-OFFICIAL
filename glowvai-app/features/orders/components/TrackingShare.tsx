import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { createTrackingShare, revokeTrackingShare } from '../../../core/services/shopTracking';
import { formatOrderDate } from '../orderUtils';

// "Share tracking link": a link anyone can open to see only the order's stage, estimate and store. It works for 48 hours.
// The link is made on the server; this card shows it, copies or shares it, and can replace or revoke it.
export const TrackingShareCard: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { showToast } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const offer = async (url: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Order #${orderId} on GlowVai`, text: 'Follow my GlowVai order', url });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
        // Fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote('Link copied. Anyone with it can see this order’s status until it expires.');
    } catch {
      setNote('Copy this link to share it.');
    }
  };

  const create = async () => {
    setBusy(true);
    setNote(null);
    const res = await createTrackingShare(orderId);
    setBusy(false);
    if (!res.ok || !res.data) {
      showToast(res.error || 'The link could not be made. Try again.');
      return;
    }
    setUrl(res.data.url);
    setExpiresAt(res.data.expiresAt);
    await offer(res.data.url);
  };

  const revoke = async () => {
    setBusy(true);
    const res = await revokeTrackingShare(orderId);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || 'The link could not be turned off. Try again.');
      return;
    }
    setUrl(null);
    setExpiresAt(null);
    setNote('The link is turned off. Nobody can open it now.');
  };

  const expiry = formatOrderDate(expiresAt ? Date.parse(expiresAt) : null);

  return (
    <section className="orders-card" aria-labelledby={`share-${orderId}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h2 id={`share-${orderId}`} className="orders-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link2 size={16} /> Share tracking link
      </h2>
      <p className="orders-note">
        Share a link that shows only this order's status, delivery estimate and store name. It does not show your name, phone, address or items, and it stops working after 48 hours.
      </p>
      {url && (
        <>
          <p className="orders-note" role="status">
            Link ready{expiry ? `, valid until ${expiry}` : ''}.
          </p>
          <label htmlFor={`share-url-${orderId}`} className="orders-note">
            Tracking link
          </label>
          <input id={`share-url-${orderId}`} readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '12px' }} />
        </>
      )}
      <div className="orders-action-grid">
        <button type="button" className="orders-primary-button" onClick={() => void (url ? offer(url) : create())} disabled={busy}>
          {url ? 'Share link again' : busy ? 'Making link…' : 'Share tracking link'}
        </button>
        {url && (
          <button type="button" className="orders-secondary-button" onClick={() => void create()} disabled={busy}>
            Make a new link
          </button>
        )}
        {url && (
          <button type="button" className="orders-danger-button" onClick={() => void revoke()} disabled={busy}>
            Turn off link
          </button>
        )}
      </div>
      {note && (
        <p className="orders-note" role="status">
          {note}
        </p>
      )}
    </section>
  );
};
