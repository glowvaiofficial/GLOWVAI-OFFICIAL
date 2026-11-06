import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  RETURN_REASON_OPTIONS,
  createReturnRequest,
  fetchOrderTracking,
  type OrderTracking,
  type ReturnReason,
  type ReturnType,
} from '../../core/services/shopTracking';
import { OrdersHeader } from '../orders/components/OrdersHeader';
import { OrdersEmpty, formatOrderDate, formatRupee, useRequestedOrder } from '../orders/orderUtils';
import '../orders/tracking.css';

const NOTE_MAX = 500;

// A fresh id for this form. Sent with the request, so a retry after a dropped connection cannot create a second request.
const newRequestId = (): string => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-');
};

// Ask for a return (money back) or a replacement for items of a delivered order, within 7 days of delivery. The server
// makes the decision; this screen only shows what it will refuse, so the customer is not surprised.
export const ReturnRequestScreen: React.FC = () => {
  const { goBack, navigate, showToast, activeParams } = useApp();
  const { order, requestedId, status: listStatus } = useRequestedOrder();
  const orderId: string | null = (activeParams as { orderId?: string } | null)?.orderId ?? requestedId ?? order?.orderId ?? null;
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [type, setType] = useState<ReturnType>('RETURN');
  const [reason, setReason] = useState<ReturnReason>('DAMAGED');
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const requestId = useRef<string>(newRequestId());

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    void fetchOrderTracking(orderId).then((result) => {
      if (!alive) return;
      if (result.ok && result.data?.tracking) setTracking(result.data.tracking);
      else setTrackingError(result.error || 'We could not load this order. Try again.');
    });
    return () => {
      alive = false;
    };
  }, [orderId]);

  const lines = useMemo(() => (order && order.orderId === orderId ? order.items : []), [order, orderId]);
  const alreadyRequested = useMemo(() => new Set((tracking?.returns ?? []).flatMap((r) => r.items.map((i) => i.productId))), [tracking]);
  const reasons = RETURN_REASON_OPTIONS.filter((r) => type === 'RETURN' || !r.returnOnly);
  const windowEnds = tracking?.returnWindowEndsAt ?? null;
  const windowClosed = windowEnds !== null && Date.now() > windowEnds;
  const windowNotOpen = tracking !== null && windowEnds === null;
  const chosen = Object.entries(picked).filter(([, qty]) => qty > 0);

  if (!orderId || (!order && listStatus !== 'loading' && listStatus !== 'idle')) {
    return (
      <main className="orders-screen is-detail is-empty">
        <OrdersHeader title="Return or replace" onBack={goBack} />
        <div className="orders-body">
          <OrdersEmpty title="Choose an order" body="Open a delivered order to ask for a return or a replacement." actionLabel="See my orders" onAction={() => navigate('orders-list')} />
        </div>
      </main>
    );
  }

  const toggle = (productId: string, quantity: number, on: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[productId] = quantity;
      else delete next[productId];
      return next;
    });

  const changeType = (next: ReturnType) => {
    setType(next);
    if (next === 'REPLACEMENT' && reason === 'NO_LONGER_NEEDED') setReason('DAMAGED');
  };

  const submit = async () => {
    if (chosen.length === 0 || submitting || done) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await createReturnRequest({
      orderId,
      requestId: requestId.current,
      type,
      reason,
      note: note.trim(),
      items: chosen.map(([productId, quantity]) => ({ productId, quantity })),
    });
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error || 'The request could not be sent. Try again.');
      if (result.status === 409) {
        const refreshed = await fetchOrderTracking(orderId);
        if (refreshed.ok && refreshed.data?.tracking) setTracking(refreshed.data.tracking);
      }
      return;
    }
    setDone(true);
    showToast(type === 'REPLACEMENT' ? 'Replacement request sent' : 'Return request sent');
    navigate('orders-tracking', { orderId });
  };

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader title="Return or replace" subtitle={`#${orderId}`} onBack={goBack} />
      <div className="orders-body">
        {trackingError && <p className="orders-note is-error" role="alert">{trackingError}</p>}
        {windowEnds !== null && (
          <section className="orders-card">
            <p className="orders-note">
              {windowClosed
                ? 'The 7-day return window for this order has closed. Contact support for help.'
                : `You can ask for a return or replacement until ${formatOrderDate(windowEnds)}.`}
            </p>
          </section>
        )}
        {windowNotOpen && (
          <section className="orders-card">
            <p className="orders-note">Returns open once the order is delivered.</p>
          </section>
        )}

        <section className="orders-card">
          <h2 className="orders-card-title">What would you like?</h2>
          <fieldset className="orders-choice-group" disabled={submitting || done}>
            <legend className="orders-note">Choose one</legend>
            <label className="orders-choice">
              <input type="radio" name="return-type" checked={type === 'RETURN'} onChange={() => changeType('RETURN')} />
              <span><b>Return for a refund</b><small>We collect the item and refund it.</small></span>
            </label>
            <label className="orders-choice">
              <input type="radio" name="return-type" checked={type === 'REPLACEMENT'} onChange={() => changeType('REPLACEMENT')} />
              <span><b>Replacement</b><small>We send the same item again. Only for a faulty or wrong item.</small></span>
            </label>
          </fieldset>
        </section>

        <section className="orders-card">
          <h2 className="orders-card-title">Items</h2>
          {lines.length === 0 && <p className="orders-note">Loading the items...</p>}
          {lines.map((item) => {
            const requested = alreadyRequested.has(item.productId);
            const qty = picked[item.productId] ?? 0;
            return (
              <div key={item.productId} className="orders-choice">
                <input
                  type="checkbox"
                  aria-label={`Select ${item.title}`}
                  disabled={requested || submitting || done || windowClosed || windowNotOpen}
                  checked={qty > 0}
                  onChange={(e) => toggle(item.productId, 1, e.target.checked)}
                />
                <span>
                  <b>{item.title}</b>
                  <small>{requested ? 'A request for this item already exists.' : `${formatRupee(item.unitPrice)} each · ordered ${item.quantity}`}</small>
                  {qty > 0 && item.quantity > 1 && (
                    <label>
                      <small>Quantity </small>
                      <select value={qty} onChange={(e) => toggle(item.productId, Number(e.target.value), true)} disabled={submitting || done}>
                        {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </span>
              </div>
            );
          })}
        </section>

        <section className="orders-card">
          <h2 className="orders-card-title">Reason</h2>
          <label>
            <span className="orders-note">Why? </span>
            <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} disabled={submitting || done}>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="orders-note">
            Anything else we should know (optional)
            <textarea
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting || done}
              style={{ display: 'block', width: '100%', marginTop: 6 }}
            />
          </label>
          <p className="orders-note">{note.length}/{NOTE_MAX}</p>
        </section>

        {submitError && <p className="orders-note is-error" role="alert">{submitError}</p>}

        <button
          type="button"
          className="orders-primary-button is-block"
          disabled={chosen.length === 0 || submitting || done || windowClosed || windowNotOpen}
          onClick={() => void submit()}
        >
          <RotateCcw size={16} /> {submitting ? 'Sending...' : type === 'REPLACEMENT' ? 'Request replacement' : 'Request return'}
        </button>
      </div>
    </main>
  );
};
