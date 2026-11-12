import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { fetchSharedTracking, type SharedTracking } from '../../core/services/shopTracking';
import { OrdersHeader } from './components/OrdersHeader';
import { formatOrderDate, statusLabel } from './orderUtils';

// The public view of a tracking link. A visitor sees only what the server projects: the stage, the estimate, a delay
// notice, the store name and, while out for delivery, the rider's first name. Nothing else is shown or requested.
export const SharedTrackingScreen: React.FC = () => {
  const { goBack, navigate, activeParams } = useApp();
  const orderId = String(activeParams?.orderId ?? '');
  const token = String(activeParams?.token ?? '');
  const [state, setState] = useState<{ loading: boolean; tracking: SharedTracking | null; error: string | null }>({
    loading: true,
    tracking: null,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, tracking: null, error: null });
    void fetchSharedTracking(orderId, token).then((res) => {
      if (!alive) return;
      setState({ loading: false, tracking: res.ok && res.data ? res.data.tracking : null, error: res.ok ? null : res.error });
    });
    return () => {
      alive = false;
    };
  }, [orderId, token]);

  const t = state.tracking;
  const slot = t?.expectedWindow ?? null;
  const from = slot ? formatOrderDate(slot.from) : '';
  const to = slot ? formatOrderDate(slot.to) : '';

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader title="Order tracking" subtitle={t ? `${t.storeName} · #${t.orderId}` : undefined} onBack={goBack} />
      <div className="orders-body">
        {state.loading && (
          <section className="orders-card" role="status">
            <p className="orders-note">Loading the order status…</p>
          </section>
        )}

        {!state.loading && !t && (
          <section className="orders-card" role="alert">
            <span className="orders-empty-icon" aria-hidden="true">
              <AlertTriangle size={24} />
            </span>
            <h2 className="orders-card-title">This link is not available</h2>
            <p className="orders-note">{state.error || 'This tracking link is no longer valid. Ask the customer for a new link.'}</p>
            <button type="button" className="orders-primary-button" onClick={() => navigate('home')}>
              Go to GlowVai
            </button>
          </section>
        )}

        {t && (
          <>
            <section className="orders-card orders-status-card" aria-live="polite">
              <div className="orders-status-head">
                <span className={`orders-badge is-${t.cancelled ? 'cancelled' : t.delivered ? 'delivered' : 'active'}`}>
                  {!t.cancelled && !t.delivered && <Clock size={14} aria-hidden="true" />} {statusLabel(t.status)}
                </span>
                <strong>{t.storeName}</strong>
              </div>
              <p className="orders-note">{t.statusText}</p>
              {t.outForDelivery && (
                <p className="orders-note" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={16} aria-hidden="true" />
                  {t.riderFirstName ? `${t.riderFirstName} is bringing your order.` : 'Your order is out for delivery.'}
                </p>
              )}
              {slot && (
                <div className="orders-meta-row">
                  <span>Expected between</span>
                  <b>
                    {from} and {to}
                  </b>
                </div>
              )}
              {t.delayed && t.delayText && (
                <p className="orders-cancel-note" role="status">
                  <AlertTriangle size={16} aria-hidden="true" /> {t.delayText}
                </p>
              )}
            </section>
            <p className="orders-note">
              This is a shared view of the order status. It does not show personal details, and the link stops working after 48 hours.
            </p>
          </>
        )}
      </div>
    </main>
  );
};
