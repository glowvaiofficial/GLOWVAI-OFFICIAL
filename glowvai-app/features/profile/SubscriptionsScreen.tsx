import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Repeat, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  changeSubscription,
  createSubscription,
  fetchSubscriptions,
  type SubscriptionView,
} from '../../core/services/shopApi';
import { useDeliveryAddress } from '../commerce/components/shared';
import { ProfileHeader } from './ProfileShared';

// Subscribe and save: a product delivered every 2, 4 or 8 weeks. The shop creates each order on the due day, at the
// current price and stock. No saving is shown here: the price the customer pays is the one on the order.
export const SUBSCRIBE_INTERVALS = [2, 4, 8] as const;
export const SUBSCRIBE_QUANTITIES = [1, 2, 3, 4, 5] as const;

const SKIP_NOTE: Record<string, string> = {
  OUT_OF_STOCK: 'The last delivery was skipped because the product was out of stock. We will try again tomorrow.',
  PRODUCT_NOT_PUBLISHED: 'The last delivery was skipped because the product is not available. We will try again tomorrow.',
  PRICE_CHANGED: 'The last delivery was skipped because the price changed. We will try again tomorrow.',
  NO_PRICE: 'The last delivery was skipped because the product has no price yet. We will try again tomorrow.',
  ERROR: 'The last delivery could not be created. We will try again tomorrow.',
};

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', PAUSED: 'Paused', CANCELLED: 'Cancelled' };

const dateLabel = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

// Subscribe from the product page: interval, quantity and the delivery address the customer already gave.
export const SubscribePanel = ({ productId, productName, variantId = null }: { productId: string; productName: string; variantId?: string | null }) => {
  const { navigate, showToast } = useApp();
  const address = useDeliveryAddress();
  const [weeks, setWeeks] = useState<number>(4);
  const [quantity, setQuantity] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContact = Boolean(address?.recipientName?.trim() && address?.phoneNumber?.trim() && address?.fullAddress?.trim());

  const subscribe = async () => {
    if (!address || !hasContact) {
      setError('Add your name, phone number and delivery address at checkout first, then subscribe.');
      return;
    }
    setError(null);
    setBusy(true);
    const result = await createSubscription({
      productId,
      variantId,
      quantity,
      intervalWeeks: weeks,
      address: {
        name: address.recipientName ?? '',
        phone: address.phoneNumber ?? '',
        fullAddress: address.fullAddress,
        city: address.city,
        pincode: address.pincode,
        landmark: address.landmark ?? '',
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || 'The subscription could not be started. Try again.');
      return;
    }
    showToast(`Subscribed to ${productName}. Your first delivery is in ${weeks} weeks.`);
    navigate('profile-subscriptions');
  };

  return (
    <section className="profile-card profile-card-body subscribe-panel" aria-label="Subscribe and save">
      <span className="profile-card-title profile-title-icon"><Repeat size={16} /> Subscribe</span>
      <p className="profile-card-sub">Get {productName} delivered regularly. Pause, change or cancel any time.</p>
      <div className="profile-button-row" role="radiogroup" aria-label="Delivery interval">
        {SUBSCRIBE_INTERVALS.map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={weeks === w}
            className={`profile-button is-small ${weeks === w ? 'is-primary' : 'is-outline'}`}
            onClick={() => setWeeks(w)}
          >
            Every {w} weeks
          </button>
        ))}
      </div>
      <label className="profile-card-sub">
        Quantity{' '}
        <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-label="Quantity per delivery">
          {SUBSCRIBE_QUANTITIES.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="profile-button is-primary is-block" disabled={busy} onClick={subscribe}>
        {busy ? 'Starting...' : 'Subscribe'}
      </button>
      {error && <p className="profile-card-sub" role="alert">{error}</p>}
    </section>
  );
};

export const SubscriptionsScreen = () => {
  const { goBack, showToast } = useApp();
  const [items, setItems] = useState<SubscriptionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchSubscriptions();
    if (result.ok && result.data) {
      setItems(result.data.subscriptions);
      setError(null);
    } else {
      setError(result.error || 'Your subscriptions could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, change: Parameters<typeof changeSubscription>[1], done: string) => {
    setBusyId(id);
    const result = await changeSubscription(id, change);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'That change could not be saved.');
      return;
    }
    showToast(done);
    void load();
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Subscriptions" eyebrow="Glow rewards" onBack={goBack} />
      <div className="profile-body">
        <div className="profile-main">
          {error && <p className="profile-card-sub" role="alert">{error}</p>}
          {items && items.length === 0 && (
            <section className="profile-card profile-card-body">
              <p className="profile-card-sub">You have no subscriptions yet. Open a product and choose Subscribe.</p>
            </section>
          )}
          {(items ?? []).map((s) => {
            const live = s.status === 'ACTIVE' || s.status === 'PAUSED';
            return (
              <section key={s.id} className="profile-card profile-card-body" aria-label={`Subscription to ${s.productName}`}>
                <div className="profile-stat-row">
                  <span className="profile-card-title">{s.productName || 'Product'}</span>
                  <span className="profile-pill">{STATUS_LABEL[s.status] ?? s.status}</span>
                </div>
                <p className="profile-card-sub">
                  Every {s.intervalWeeks} weeks · {s.quantity} per delivery
                  {s.status === 'ACTIVE' && s.nextRunAt ? ` · next delivery ${dateLabel(s.nextRunAt)}` : ''}
                </p>
                {s.status === 'ACTIVE' && s.lastSkipReason && <p className="profile-card-sub">{SKIP_NOTE[s.lastSkipReason] ?? SKIP_NOTE.ERROR}</p>}
                {live && (
                  <div className="profile-button-row">
                    {s.status === 'ACTIVE' ? (
                      <button type="button" className="profile-button is-outline is-small" disabled={busyId === s.id} onClick={() => act(s.id, { action: 'pause' }, 'Subscription paused')}>
                        <Pause size={14} /> Pause
                      </button>
                    ) : (
                      <button type="button" className="profile-button is-outline is-small" disabled={busyId === s.id} onClick={() => act(s.id, { action: 'resume' }, 'Subscription resumed')}>
                        <Play size={14} /> Resume
                      </button>
                    )}
                    <label className="profile-card-sub">
                      Quantity{' '}
                      <select
                        aria-label={`Quantity for ${s.productName}`}
                        value={s.quantity}
                        disabled={busyId === s.id}
                        onChange={(e) => act(s.id, { action: 'quantity', quantity: Number(e.target.value) }, 'Quantity updated')}
                      >
                        {SUBSCRIBE_QUANTITIES.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="profile-button is-outline is-small"
                      disabled={busyId === s.id}
                      onClick={() => {
                        if (window.confirm('Cancel this subscription? No further deliveries will be made.')) act(s.id, { action: 'cancel' }, 'Subscription cancelled');
                      }}
                    >
                      <XCircle size={14} /> Cancel
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
};
