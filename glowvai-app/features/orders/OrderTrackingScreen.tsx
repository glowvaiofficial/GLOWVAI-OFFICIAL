import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, FileText, MapPin, Phone, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  RETURN_STATUS_LABEL,
  SUBSTITUTION_OPTIONS,
  fetchDeliveryCode,
  fetchLiveTracking,
  fetchOrderTracking,
  openInvoice,
  setSubstitutionPreference,
  type DeliveryCodeState,
  type LiveTracking,
  type OrderTracking,
  type SubstitutionPreference,
} from '../../core/services/shopTracking';
import { delayBanner, stageCopy } from '../../../lib/shop/tracking';
import './tracking.css';
import { OrdersHeader } from './components/OrdersHeader';
import { TrackingMap } from './components/TrackingMap';
import { TrackingStepper } from './components/TrackingStepper';
import { TrackingShareCard } from './components/TrackingShare';
import { OrdersEmpty, OrdersLoadState, formatOrderDate, statusLabel, useRequestedOrder } from './orderUtils';
import { RIDER_REFRESH_MS, riderRefreshDue, shouldFollowRider } from './trackingMapRules';

const timeText = (ms: number | null | undefined) => formatOrderDate(ms ?? null);

// Dialling a store number: digits and a leading plus only.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const OrderTrackingScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const { order, requestedId, status: listStatus, error: listError, reload: reloadList } = useRequestedOrder();
  const orderId = order?.orderId ?? null;
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveTracking | null>(null);
  const [liveState, setLiveState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [code, setCode] = useState<Extract<DeliveryCodeState, { available: true }> | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeAttempt, setCodeAttempt] = useState(0);
  const [choice, setChoice] = useState<SubstitutionPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const lastRiderRefresh = useRef(0);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoadState('loading');
    setLoadError(null);
    const result = await fetchOrderTracking(orderId);
    if (!result.ok || !result.data?.tracking) {
      setLoadState('error');
      setLoadError(result.error || 'We could not load this order. Try again.');
      return;
    }
    setTracking(result.data.tracking);
    setChoice(result.data.tracking.substitutionPreference.value);
    setLoadState('ready');
  }, [orderId]);

  const loadLive = useCallback(async () => {
    if (!orderId) return;
    setLiveState((s) => (s === 'ready' ? s : 'loading'));
    const result = await fetchLiveTracking(orderId);
    lastRiderRefresh.current = Date.now();
    if (!result.ok || !result.data?.tracking) {
      setLiveState('error');
      setLiveError(result.error || 'We could not load your delivery update. Try again.');
      return;
    }
    setLive(result.data.tracking);
    setLiveError(null);
    setLiveState('ready');
  }, [orderId]);

  useEffect(() => {
    void load();
    void loadLive();
  }, [load, loadLive]);

  // While the order is out, the rider's point is refreshed at most every 30 seconds. The timer stops when the tab is hidden.
  const status = live?.status ?? null;
  useEffect(() => {
    if (!orderId || !shouldFollowRider(status)) return;
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => {
        if (riderRefreshDue(lastRiderRefresh.current, Date.now())) void loadLive();
      }, RIDER_REFRESH_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (riderRefreshDue(lastRiderRefresh.current, Date.now())) void loadLive();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [orderId, status, loadLive]);

  // The delivery code is requested only at stage 8, and only then.
  const atDoor = live?.stage === 8;
  useEffect(() => {
    if (!orderId || !atDoor) return;
    let cancelled = false;
    setCodeError(null);
    void fetchDeliveryCode(orderId).then((result) => {
      if (cancelled) return;
      const state = result.ok ? result.data?.deliveryCode : null;
      if (state?.available) setCode(state);
      else if (result.ok) setCodeError(null);
      else setCodeError(result.error || 'The delivery code could not be loaded. Try again.');
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, atDoor, codeAttempt]);

  if (!order) {
    const loading = listStatus === 'idle' || listStatus === 'loading' || listStatus === 'error';
    return (
      <main className="orders-screen is-detail is-empty">
        <OrdersHeader title="Track order" onBack={goBack} />
        <div className="orders-body">
          {loading ? (
            <OrdersLoadState status={listStatus} error={listError} onRetry={() => void reloadList()} hasOrders={false} />
          ) : (
            <OrdersEmpty
              title={requestedId ? 'Order not found' : 'No orders yet'}
              body={requestedId ? `Order #${requestedId} is not on your account.` : 'Place an order and its progress will show up here.'}
              actionLabel={requestedId ? 'See my orders' : 'Shop now'}
              onAction={requestedId ? () => navigate('orders-list') : undefined}
            />
          )}
        </div>
      </main>
    );
  }

  const delivered = !!tracking?.deliveredAt || tracking?.status === 'DELIVERED';
  const cancelled = String(tracking?.status ?? order.status).toUpperCase() === 'CANCELLED';
  const returnOpen = !!tracking && !cancelled && tracking.returnWindowEndsAt !== null && Date.now() <= tracking.returnWindowEndsAt;
  const preferenceDirty = !!tracking && choice !== tracking.substitutionPreference.value;

  // At stage 8 the server's subtitle has no code yet; fill it in once the code is known.
  const heroTitle = live?.title ?? '';
  const heroSubtitle =
    live?.stage === 8 && code
      ? stageCopy(8, { riderFirstName: live.riderFirstName, deliveryCode: code.code }).subtitle
      : live?.subtitle ?? '';
  const storePhone = live?.storePhone ?? null;
  const banner = live?.delay ? delayBanner(live.delay, live.riderFirstName) : null;

  const savePreference = async () => {
    if (!choice || !tracking) return;
    setSaving(true);
    setSaveError(null);
    const result = await setSubstitutionPreference(order.orderId, choice);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error || 'The preference could not be saved. Try again.');
      return;
    }
    showToast('Your preference is saved');
    await load();
  };

  const onInvoice = async () => {
    setInvoiceError(null);
    const problem = await openInvoice(order.orderId);
    if (problem) setInvoiceError(problem);
  };

  return (
    <main className="orders-screen is-detail trk-screen">
      <OrdersHeader title="Track order" subtitle={`#${order.orderId}`} onBack={goBack} />

      <div className="orders-body">
        {loadState === 'error' && (
          <div className="orders-card">
            <p className="orders-note">{loadError}</p>
            <button type="button" className="orders-secondary-button" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {liveState === 'error' && !live && (
          <section className="trk-card" aria-live="polite">
            <p className="trk-note is-error">{liveError}</p>
            <button type="button" className="trk-button" onClick={() => void loadLive()}>Retry</button>
          </section>
        )}

        {liveState === 'loading' && !live && <p className="trk-note" role="status">Loading the latest update...</p>}

        {banner && (
          <section className="trk-delay" role="status" aria-label="Delivery delay">
            <b>{banner.title}</b>
            <p>{banner.body}</p>
          </section>
        )}

        {live && (
          <section className="trk-card trk-hero" aria-live="polite" aria-labelledby="trk-hero-title">
            <p className="trk-eyebrow">
              <Clock size={14} aria-hidden="true" /> {live.cancelled ? 'Cancelled' : live.stage === 9 ? 'Delivered' : 'Live update'}
            </p>
            <h2 className="trk-title" id="trk-hero-title">{heroTitle}</h2>
            {heroSubtitle && <p className="trk-subtitle">{heroSubtitle}</p>}
            {live.estimateMinutes !== null && <p className="trk-estimate">Delivery in about {live.estimateMinutes} min</p>}

            {atDoor && (
              <div className="trk-otp" aria-label="Delivery OTP">
                <span className="trk-otp-label">Delivery OTP</span>
                {code ? (
                  <strong className="trk-otp-code">{code.code}</strong>
                ) : (
                  <span className="trk-note">Your code will show here. {codeError ?? ''}</span>
                )}
                {code?.locked && <span className="trk-note is-error">Code locked after wrong attempts. Try again in {code.lockedMinutes} min.</span>}
                {!code && codeError && (
                  <button type="button" className="trk-button" onClick={() => setCodeAttempt((n) => n + 1)}>Retry</button>
                )}
              </div>
            )}
          </section>
        )}

        {live && live.steps.length > 0 && (
          <section className="trk-card" aria-labelledby="trk-progress-title">
            <h2 className="trk-section-title" id="trk-progress-title">Progress</h2>
            <TrackingStepper steps={live.steps} />
          </section>
        )}

        {live && <TrackingMap map={live.map} />}

        {storePhone && (
          <a className="trk-button is-block" href={telHref(storePhone)}>
            <Phone size={16} aria-hidden="true" /> Call store
          </a>
        )}

        {orderId && <TrackingShareCard orderId={orderId} />}

        <section className="orders-card orders-status-card" aria-label="Order details">
          <div className="orders-status-head">
            <span className={`orders-badge is-${cancelled ? 'cancelled' : delivered ? 'delivered' : 'active'}`}>
              <Clock size={14} /> {statusLabel(tracking?.status ?? order.status)}
            </span>
            <strong>#{order.orderId}</strong>
          </div>
          {tracking?.placedAt && (
            <div className="orders-meta-row">
              <span>Placed</span>
              <b>{timeText(tracking.placedAt)}</b>
            </div>
          )}
          {tracking?.deliveredAt && (
            <div className="orders-meta-row">
              <span>Delivered</span>
              <b>{timeText(tracking.deliveredAt)}</b>
            </div>
          )}
          {tracking?.expectedWindow && (
            <div className="orders-meta-row">
              <span>Expected delivery</span>
              <b>{`${timeText(tracking.expectedWindow.from)} to ${timeText(tracking.expectedWindow.to)}`}</b>
            </div>
          )}
        </section>

        {tracking?.rider && (
          <section className="orders-card">
            <h2 className="orders-card-title"><Phone size={16} /> Delivery partner</h2>
            {tracking.rider.name && <p className="orders-note">{tracking.rider.name}</p>}
            {tracking.rider.phone && (
              tracking.rider.phone.tel ? (
                <a className="orders-secondary-button" href={`tel:${tracking.rider.phone.tel}`}>
                  <Phone size={16} /> Call {tracking.rider.phone.display}
                </a>
              ) : (
                <p className="orders-note">Phone {tracking.rider.phone.display}</p>
              )
            )}
          </section>
        )}

        {tracking && tracking.timeline.length > 0 && (
          <section className="orders-card">
            <h2 className="orders-card-title">Updates</h2>
            <ol className="orders-timeline">
              {tracking.timeline.map((entry, index) => (
                <li key={`${entry.at ?? 'x'}-${index}`}>
                  <b>{entry.label}</b>
                  {entry.at && <small>{timeText(entry.at)}</small>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {tracking?.address && (
          <section className="orders-card">
            <h2 className="orders-card-title"><MapPin size={16} /> Delivery address</h2>
            <p className="orders-note">
              {[tracking.address.recipientName, tracking.address.fullAddress, tracking.address.landmark, tracking.address.city, tracking.address.pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          </section>
        )}

        <section className="orders-card">
          <h2 className="orders-card-title"><ShieldCheck size={16} /> If an item is unavailable</h2>
          {tracking && !tracking.substitutionPreference.canChange && (
            <p className="orders-note">{tracking.substitutionPreference.changeBlockedReason}</p>
          )}
          <fieldset className="orders-choice-group" disabled={!tracking || !tracking.substitutionPreference.canChange || saving}>
            <legend className="orders-note">Choose one</legend>
            {SUBSTITUTION_OPTIONS.map((option) => (
              <label key={option.id} className="orders-choice">
                <input type="radio" name="substitution" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} />
                <span>
                  <b>{option.label}</b>
                  <small>{option.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {saveError && <p className="orders-note is-error" role="alert">{saveError}</p>}
          {tracking?.substitutionPreference.canChange && (
            <button type="button" className="orders-primary-button is-block" disabled={!preferenceDirty || saving || !choice} onClick={() => void savePreference()}>
              {saving ? 'Saving...' : 'Save preference'}
            </button>
          )}
        </section>

        {tracking && tracking.returns.length > 0 && (
          <section className="orders-card">
            <h2 className="orders-card-title"><RotateCcw size={16} /> Returns and replacements</h2>
            {tracking.returns.map((ret) => (
              <div key={ret.returnId} className="orders-meta-row">
                <span>
                  {ret.type === 'REPLACEMENT' ? 'Replacement' : 'Return'} · {ret.items.map((i) => `${i.title} x${i.quantity}`).join(', ')}
                </span>
                <b>{RETURN_STATUS_LABEL[ret.status] ?? ret.status}</b>
              </div>
            ))}
          </section>
        )}

        <div className="orders-detail-side">
          {returnOpen && (
            <button type="button" className="orders-secondary-button is-block" onClick={() => navigate('returns-request', { orderId: order.orderId })}>
              <RotateCcw size={16} /> Return or replace an item
            </button>
          )}
          {delivered && (
            <>
              <button type="button" className="orders-secondary-button is-block" onClick={() => void onInvoice()}>
                <FileText size={16} /> View invoice
              </button>
              {invoiceError && <p className="orders-note is-error" role="alert">{invoiceError}</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
};
