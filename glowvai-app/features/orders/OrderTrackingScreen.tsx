import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bike, Check, ChevronRight, Clock, FileText, Headset, KeyRound, MapPin, MessageSquareMore, MoreVertical, Phone, RefreshCw, RotateCcw, ShieldCheck, ShoppingBag, Sparkles, Store, Zap } from 'lucide-react';
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
import { delayBanner, formatArrivalTime, stageCopy } from '../../../lib/shop/tracking';
import '../commerce/premium.css';
import './tracking.css';
import './tracking-premium.css';
import { OrdersHeader } from './components/OrdersHeader';
import { TRACKING_MAP_SUPPORTED, TrackingMap } from './components/TrackingMap';
import { TrackingShareCard } from './components/TrackingShare';
import { TrackingPromoCard, useTrackingPromos } from './components/TrackingPromos';
import { OrdersEmpty, OrdersLoadState, formatOrderDate, statusLabel, useRequestedOrder } from './orderUtils';
import { BrandLogo } from '../../shared/BrandLogo';
import { RIDER_REFRESH_MS, riderRefreshDue, shouldFollowRider } from './trackingMapRules';
import {
  canSuggestAddItems,
  deliveringToLine,
  etaText,
  hasMapPoint,
  riderView,
  stageHeadline,
  stepperSteps,
  timeliness,
  trackingLayout,
  type RiderView,
  type StepperStep,
} from './orderProgress';

const timeText = (ms: number | null | undefined) => formatOrderDate(ms ?? null);

// Dialling a store number: digits and a leading plus only.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const Steps: React.FC<{ steps: StepperStep[] }> = ({ steps }) => (
  <ol className="trk-steps" aria-label="Order progress">
    {steps.map((step) => (
      <li key={step.stage} className={`trk-step is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
        <span className="trk-dot" aria-hidden="true">
          {step.state === 'done' && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="trk-step-label">{step.title}</span>
        <span className="trk-sr">, {step.state === 'done' ? 'done' : step.state === 'current' ? 'current step' : 'not yet'}</span>
      </li>
    ))}
  </ol>
);

// The rider row: initial, first name, masked phone and a call button only when the server gave a callable number.
const RiderRow: React.FC<{ rider: RiderView | null; waiting: string | null; deliveringTo: string | null; onChat: () => void }> = ({ rider, waiting, deliveringTo, onChat }) => (
  <div className="trk-rider">
    <span className={`trk-rider-avatar${rider ? '' : ' is-waiting'}`} aria-hidden="true">
      {rider ? rider.initial : <Bike size={20} />}
    </span>
    <div className="trk-rider-copy">
      {rider ? (
        <b>
          {rider.name}
          {rider.phoneDisplay && <span> • {rider.phoneDisplay}</span>}
        </b>
      ) : (
        <b>{waiting ?? 'Delivery partner'}</b>
      )}
      {deliveringTo && (
        <small>
          Delivering to: <span>{deliveringTo}</span>
        </small>
      )}
    </div>
    <div className="trk-rider-actions">
      {rider?.tel && (
        <a className="trk-round-btn" href={`tel:${rider.tel}`} aria-label={`Call ${rider.name}`}>
          <Phone size={18} aria-hidden="true" />
        </a>
      )}
      <button type="button" className="trk-round-btn" onClick={onChat} aria-label="Get help with this order">
        <MessageSquareMore size={18} aria-hidden="true" />
      </button>
    </div>
  </div>
);

// Live order tracking. The stage (1 to 9), its words, any delay, the estimate, the map points and the delivery code come
// from GET /api/shop/orders/{id}/tracking; the rider's name and masked phone, the address, the preference and the history
// from GET /api/shop/orders/{id}. Nothing is invented: no estimate, rider or map point means that part is not shown.
// Phones: one column (the map large while the order is out for delivery). 1024px and wider: map and status on the
// left, the details on the right.
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
  const [refreshing, setRefreshing] = useState(false);
  const lastRiderRefresh = useRef(0);
  const promos = useTrackingPromos(2);

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

  const shownStatus = tracking?.status ?? order.status;
  const delivered = !!tracking?.deliveredAt || String(shownStatus).toUpperCase() === 'DELIVERED' || live?.stage === 9;
  const cancelled = live?.cancelled === true || ['CANCELLED', 'VENDOR_REJECTED'].includes(String(shownStatus).toUpperCase());
  const returnOpen = !!tracking && !cancelled && tracking.returnWindowEndsAt !== null && Date.now() <= tracking.returnWindowEndsAt;
  const preferenceDirty = !!tracking && choice !== tracking.substitutionPreference.value;
  const stage = live?.stage ?? null;
  const riderFirst = live?.riderFirstName ?? null;

  // At stage 8 the server's subtitle has no code yet; fill it in once the code is known.
  const heroSubtitle = live?.stage === 8 && code ? stageCopy(8, { riderFirstName: riderFirst, deliveryCode: code.code }).subtitle : live?.subtitle ?? '';
  const storePhone = live?.storePhone ?? null;
  const banner = live?.delay && stage !== 9 ? delayBanner(live.delay, riderFirst) : null;
  const eta = !cancelled && stage !== 9 ? etaText(live?.estimateMinutes ?? null) : null;
  const windowLabel = !cancelled && !delivered && tracking?.expectedWindow ? `${formatArrivalTime(tracking.expectedWindow.from)} – ${formatArrivalTime(tracking.expectedWindow.to)}` : null;
  const pill = timeliness({ stage, cancelled, hasDelay: !!live?.delay, hasEstimate: !!eta || !!windowLabel });
  const rider = cancelled ? null : riderView(tracking?.rider ?? null, riderFirst);
  const deliveringTo = deliveringToLine(tracking?.address ?? order.shippingAddress ?? null);
  const waiting = rider || delivered || cancelled ? null : stage === null || stage <= 1 ? 'A rider is assigned once the store accepts' : 'Assigning a rider';
  const headline = stageHeadline(stage, riderFirst) ?? (tracking?.statusText || statusLabel(shownStatus));
  const steps = live ? stepperSteps(live.steps, stage) : [];
  const layout = trackingLayout({ live, cancelled, mapSupported: TRACKING_MAP_SUPPORTED });
  const showStrip = layout === 'card' && TRACKING_MAP_SUPPORTED && !cancelled && !delivered && hasMapPoint(live);
  const openSupport = () => navigate('profile-support', { orderId: order.orderId });
  const openDetails = () => navigate('orders-detail', { orderId: order.orderId });

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadLive()]);
    setRefreshing(false);
  };

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

  const otp = atDoor ? (
    <div className="trk-otp" aria-label="Delivery OTP">
      <span className="trk-otp-label">
        <KeyRound size={15} aria-hidden="true" /> Delivery OTP
      </span>
      {code ? <strong className="trk-otp-code">{code.code}</strong> : <span className="trk-note">Your code will show here. {codeError ?? ''}</span>}
      {code?.locked && <span className="trk-note is-error">Code locked after wrong attempts. Try again in {code.lockedMinutes} min.</span>}
      {!code && codeError && (
        <button type="button" className="trk-button" onClick={() => setCodeAttempt((n) => n + 1)}>
          Retry
        </button>
      )}
    </div>
  ) : null;

  const delay = banner ? (
    <section className="trk-delay" role="status" aria-label="Delivery delay">
      <b>{banner.title}</b>
      <p>{banner.body}</p>
    </section>
  ) : null;

  const liveLoad =
    liveState === 'error' && !live ? (
      <section className="trk-card" aria-live="polite">
        <p className="trk-note is-error">{liveError}</p>
        <button type="button" className="trk-button" onClick={() => void loadLive()}>
          Retry
        </button>
      </section>
    ) : liveState !== 'ready' && !live ? (
      <section className="trk-card trk-skeleton" aria-busy="true">
        <span />
        <span />
        <span className="is-short" />
        <p className="trk-sr" role="status">
          Loading the latest update...
        </p>
      </section>
    ) : null;

  const addItems = canSuggestAddItems(stage, cancelled) ? (
    <button type="button" className="trk-add" onClick={() => navigate('home')}>
      <span className="trk-add-art" aria-hidden="true">
        <ShoppingBag size={26} />
        <Sparkles size={14} className="trk-add-spark" />
      </span>
      <span className="trk-add-copy">
        <b>Forgot to add something?</b>
        <small>Shop more and place a quick add-on order.</small>
      </span>
      <span className="trk-add-btn">
        Add Items <ChevronRight size={15} aria-hidden="true" />
      </span>
    </button>
  ) : null;

  // The status card: estimate (or window), on time or delayed, the stage headline, the rider and the OTP.
  const statusCard = cancelled ? (
    <section className="trk-card trk-status is-cancelled" aria-live="polite">
      <h2 className="trk-status-headline">Order cancelled</h2>
      <p className="trk-subtitle">{tracking?.statusText ?? live?.subtitle ?? 'This order was cancelled and will not be delivered.'}</p>
    </section>
  ) : live ? (
    <section className="trk-card trk-status" aria-live="polite" aria-labelledby="trk-status-headline">
      <div className="trk-status-top">
        <div className="trk-status-copy">
          {delivered ? (
            <p className="trk-eta-label">Delivered</p>
          ) : eta ? (
            <>
              <p className="trk-eta-label">Arriving in</p>
              <p className="trk-eta" aria-label={eta.spoken}>
                {eta.value} {eta.unit}
              </p>
            </>
          ) : windowLabel ? (
            <>
              <p className="trk-eta-label">Expected delivery</p>
              <p className="trk-eta is-window">{windowLabel}</p>
            </>
          ) : (
            <p className="trk-eta-label">Live update</p>
          )}
          <h2 className="trk-status-headline" id="trk-status-headline">
            {headline}
          </h2>
          {heroSubtitle && <p className="trk-subtitle">{heroSubtitle}</p>}
        </div>
        <div className="trk-status-side">
          {pill && (
            <span className={`trk-pill is-${pill}`}>
              {pill === 'on-time' ? <Zap size={14} aria-hidden="true" fill="currentColor" /> : <Clock size={14} aria-hidden="true" />}
              {pill === 'on-time' ? 'On time' : 'Delayed'}
            </span>
          )}
          <span className={`trk-scooter${delivered ? ' is-done' : ''}`} aria-hidden="true">
            {delivered ? <Check size={40} strokeWidth={2.4} /> : stage !== null && stage >= 5 ? <Bike size={46} strokeWidth={1.6} /> : <Store size={42} strokeWidth={1.6} />}
          </span>
        </div>
      </div>
      {otp}
      {delay}
      {!delivered && <RiderRow rider={rider} waiting={waiting} deliveringTo={deliveringTo} onChat={openSupport} />}
    </section>
  ) : null;

  const help = (
    <button type="button" className="trk-help" onClick={openSupport}>
      <span className="trk-help-icon" aria-hidden="true">
        <Headset size={20} />
      </span>
      <span className="trk-help-copy">
        <b>Need help with this order?</b>
        <small>If you face any issue, talk to our support team.</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );

  const stepsCard =
    steps.length > 0 && !cancelled ? (
      <section className="trk-card" aria-labelledby="trk-progress-title">
        <h2 className="trk-section-title" id="trk-progress-title">
          Progress
        </h2>
        <Steps steps={steps} />
      </section>
    ) : null;

  const details = (
    <>
      {storePhone && (
        <a className="trk-button is-block is-ghost" href={telHref(storePhone)}>
          <Phone size={16} aria-hidden="true" /> Call store
        </a>
      )}

      <section className="trk-card trk-details" aria-label="Order details">
        <div className="trk-details-head">
          <span className={`orders-badge is-${cancelled ? 'cancelled' : delivered ? 'delivered' : 'active'}`}>
            <Clock size={14} aria-hidden="true" /> {statusLabel(shownStatus)}
          </span>
          <button type="button" className="trk-link" onClick={openDetails}>
            View item list <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
        {tracking?.placedAt && (
          <div className="trk-meta-row">
            <span>Placed</span>
            <b>{timeText(tracking.placedAt)}</b>
          </div>
        )}
        {tracking?.deliveredAt && (
          <div className="trk-meta-row">
            <span>Delivered</span>
            <b>{timeText(tracking.deliveredAt)}</b>
          </div>
        )}
        {tracking?.expectedWindow && (
          <div className="trk-meta-row">
            <span>Expected delivery</span>
            <b>{`${timeText(tracking.expectedWindow.from)} to ${timeText(tracking.expectedWindow.to)}`}</b>
          </div>
        )}
        {tracking?.address && (
          <div className="trk-meta-row is-address">
            <span>
              <MapPin size={14} aria-hidden="true" /> Address
            </span>
            <b>{[tracking.address.recipientName, tracking.address.fullAddress, tracking.address.landmark, tracking.address.city, tracking.address.pincode].filter(Boolean).join(', ')}</b>
          </div>
        )}
      </section>

      {loadState === 'error' && (
        <section className="trk-card">
          <p className="trk-note is-error">{loadError}</p>
          <button type="button" className="trk-button" onClick={() => void load()}>
            Try again
          </button>
        </section>
      )}

      {tracking && tracking.timeline.length > 0 && (
        <section className="trk-card">
          <h2 className="trk-section-title">Updates</h2>
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

      <section className="trk-card">
        <h2 className="trk-section-title">
          <ShieldCheck size={16} aria-hidden="true" /> If an item is unavailable
        </h2>
        {tracking && !tracking.substitutionPreference.canChange && <p className="trk-note">{tracking.substitutionPreference.changeBlockedReason}</p>}
        <fieldset className="orders-choice-group" disabled={!tracking || !tracking.substitutionPreference.canChange || saving}>
          <legend className="trk-sr">Choose one</legend>
          {SUBSTITUTION_OPTIONS.map((option) => (
            <label key={option.id} className={`orders-choice${choice === option.id ? ' is-on' : ''}`}>
              <input type="radio" name="substitution" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} />
              <span>
                <b>{option.label}</b>
                <small>{option.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {saveError && (
          <p className="trk-note is-error" role="alert">
            {saveError}
          </p>
        )}
        {tracking?.substitutionPreference.canChange && (
          <button type="button" className="trk-button is-block" disabled={!preferenceDirty || saving || !choice} onClick={() => void savePreference()}>
            {saving ? 'Saving...' : 'Save preference'}
          </button>
        )}
      </section>

      {tracking && tracking.returns.length > 0 && (
        <section className="trk-card">
          <h2 className="trk-section-title">
            <RotateCcw size={16} aria-hidden="true" /> Returns and replacements
          </h2>
          {tracking.returns.map((ret) => (
            <div key={ret.returnId} className="trk-meta-row">
              <span>
                {ret.type === 'REPLACEMENT' ? 'Replacement' : 'Return'} · {ret.items.map((i) => `${i.title} x${i.quantity}`).join(', ')}
              </span>
              <b>{RETURN_STATUS_LABEL[ret.status] ?? ret.status}</b>
            </div>
          ))}
        </section>
      )}

      <TrackingShareCard orderId={order.orderId} />

      <div className="trk-actions">
        {returnOpen && (
          <button type="button" className="trk-button is-block is-ghost" onClick={() => navigate('returns-request', { orderId: order.orderId })}>
            <RotateCcw size={16} aria-hidden="true" /> Return or replace an item
          </button>
        )}
        {delivered && (
          <>
            <button type="button" className="trk-button is-block is-ghost" onClick={() => void onInvoice()}>
              <FileText size={16} aria-hidden="true" /> View invoice
            </button>
            {invoiceError && (
              <p className="trk-note is-error" role="alert">
                {invoiceError}
              </p>
            )}
          </>
        )}
        <button type="button" className="trk-button is-block is-ghost" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw size={16} aria-hidden="true" /> {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>
    </>
  );

  const header = (
    <header className={`trk-head${layout === 'map' ? ' is-floating' : ''}`}>
      <button type="button" className="trk-round-btn is-head" onClick={goBack} aria-label="Go back">
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="trk-head-copy">
        <span className="gvp-wordmark">
          <BrandLogo height={24} />
          {layout === 'map' && <span className="trk-head-order"> order</span>}
        </span>
        <h1 className="trk-head-sub">Order #{order.orderId}</h1>
      </div>
      <button type="button" className="trk-round-btn is-head" onClick={openDetails} aria-label="Order details">
        <MoreVertical size={20} aria-hidden="true" />
      </button>
    </header>
  );

  if (layout === 'map' && live) {
    const tile = eta ?? (typeof live.distanceKm === 'number' ? { value: live.distanceKm.toFixed(1), unit: 'km away', spoken: `${live.distanceKm.toFixed(1)} kilometres away` } : null);
    const sheetTitle = stage === 8 ? live.title : 'Out for delivery';
    return (
      <main className="gvp trk-screen trk-premium is-map">
        {header}
        <div className="trk-grid">
          <div className="trk-col-main">
            <TrackingMap map={live.map} variant="hero" />
            <section className="trk-card trk-sheet" aria-live="polite" aria-labelledby="trk-sheet-title">
              <span className="trk-handle" aria-hidden="true" />
              <div className="trk-sheet-top">
                <div>
                  <h2 className="trk-sheet-title" id="trk-sheet-title">
                    {sheetTitle}
                  </h2>
                  <p className="trk-subtitle">{heroSubtitle || headline}</p>
                </div>
                {tile && (
                  <span className="trk-tile" aria-label={tile.spoken}>
                    <b>{tile.value}</b>
                    <small>{tile.unit}</small>
                  </span>
                )}
              </div>
              {pill === 'delayed' && <span className="trk-pill is-delayed">Delayed</span>}
              {otp}
              {delay}
              <RiderRow rider={rider} waiting={waiting ?? "Your rider's name shows here once the store shares it"} deliveringTo={deliveringTo} onChat={openSupport} />
              <button type="button" className="trk-link is-big" onClick={openDetails}>
                View item list <ChevronRight size={18} aria-hidden="true" />
              </button>
            </section>
            <div className="trk-safe">
              <span className="trk-safe-art" aria-hidden="true">
                <Bike size={30} />
              </span>
              <span>
                <b>Our delivery partner will arrive safely</b>
                <small>Share the OTP only at your door, when you have your order.</small>
              </span>
            </div>
            {stepsCard}
          </div>
          <div className="trk-col-side">
            {promos.slice(0, 1).map((p) => (
              <TrackingPromoCard key={p.id} section={p} />
            ))}
            {help}
            {details}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="gvp trk-screen trk-premium">
      {header}
      <div className="trk-grid">
        <div className="trk-col-main">
          {showStrip && live && <TrackingMap map={live.map} variant="strip" />}
          {addItems}
          {liveLoad}
          {statusCard}
          {stepsCard}
        </div>
        <div className="trk-col-side">
          {help}
          {promos.map((p) => (
            <TrackingPromoCard key={p.id} section={p} />
          ))}
          {details}
        </div>
      </div>
    </main>
  );
};
