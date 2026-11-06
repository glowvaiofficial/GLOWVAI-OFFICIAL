import React, { useCallback, useEffect, useState } from 'react';
import { Clock, FileText, MapPin, Phone, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  RETURN_STATUS_LABEL,
  SUBSTITUTION_OPTIONS,
  fetchOrderTracking,
  openInvoice,
  setSubstitutionPreference,
  type OrderTracking,
  type SubstitutionPreference,
} from '../../core/services/shopTracking';
import { OrdersHeader } from './components/OrdersHeader';
import { OrdersEmpty, OrdersLoadState, formatOrderDate, statusLabel, useRequestedOrder } from './orderUtils';
import { fullArrivalWindow } from '../../../lib/shop/subscribable';

const timeText = (ms: number | null | undefined) => formatOrderDate(ms ?? null);

// The order's journey as the GlowVai server records it. There is no live map, rider position or ETA here: when the
// order does not carry an expected window, none is shown.
export const OrderTrackingScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const { order, requestedId, status: listStatus, error: listError, reload: reloadList } = useRequestedOrder();
  const orderId = order?.orderId ?? null;
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  // Shown only with both ends of the window; one end on its own is not an estimate.
  const arrival = fullArrivalWindow(tracking?.expectedWindow ?? null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState<SubstitutionPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

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
    <main className="orders-screen is-detail">
      <OrdersHeader title="Track order" subtitle={`#${order.orderId}`} onBack={goBack} />

      <div className="orders-body">
        {loadState === 'error' && (
          <div className="orders-card">
            <p className="orders-note">{loadError}</p>
            <button type="button" className="orders-secondary-button" onClick={() => void load()}>Try again</button>
          </div>
        )}

        <section className="orders-card orders-status-card" aria-live="polite">
          <div className="orders-status-head">
            <span className={`orders-badge is-${cancelled ? 'cancelled' : delivered ? 'delivered' : 'active'}`}>
              <Clock size={14} /> {statusLabel(tracking?.status ?? order.status)}
            </span>
            <strong>#{order.orderId}</strong>
          </div>
          <p className="orders-note">{loadState === 'loading' && !tracking ? 'Loading the latest update...' : tracking?.statusText ?? ''}</p>
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
          <div className="orders-meta-row">
            <span>Expected delivery</span>
            <b>
              {arrival ? `${timeText(arrival.from)} to ${timeText(arrival.to)}` : 'No estimate yet'}
            </b>
          </div>
        </section>

        <section className="orders-card" aria-label="Live location">
          <h2 className="orders-card-title"><MapPin size={16} /> Live location</h2>
          <p className="orders-note">{tracking?.liveLocation.note ?? 'Live location is not available yet.'}</p>
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
