import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, Zap } from 'lucide-react';
import { fetchDeliverySlots, type DeliverySlotView } from '../../../core/services/shopApi';
import { useCheckoutSession } from '../lib/checkoutSession';

// The times the server offers right now. Read at most once a minute while checkout is open, and kept for a minute so
// going back and forth does not read again. The server decides what is offered (shop hours, lead time).
const CACHE_MS = 60_000;
let cache: { at: number; shopOpen: boolean; slots: DeliverySlotView[] } | null = null;

interface SlotState {
  slots: DeliverySlotView[];
  shopOpen: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDeliverySlots(): SlotState {
  const [state, setState] = useState(() => ({
    slots: cache?.slots ?? [],
    shopOpen: cache?.shopOpen ?? false,
    loading: !cache,
    error: null as string | null,
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fresh = cache && Date.now() - cache.at < CACHE_MS;
    if (fresh && tick === 0) return undefined;
    setState((s) => ({ ...s, loading: true, error: null }));
    void fetchDeliverySlots().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        cache = { at: Date.now(), shopOpen: res.data.shopOpen, slots: res.data.slots };
        setState({ slots: res.data.slots, shopOpen: res.data.shopOpen, loading: false, error: null });
      } else {
        setState((s) => ({ ...s, loading: false, error: res.error ?? 'Delivery times could not be loaded.' }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Times move with the clock, so the list is refreshed while the customer is on checkout.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), CACHE_MS);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(() => {
    cache = null;
    setTick((t) => t + 1);
  }, []);

  return { ...state, refresh };
}

const DAY_HEADING = { today: 'Today', tomorrow: 'Tomorrow' } as const;

// Lets the customer choose when the order should arrive. Only times the server offers are shown. Windows are estimates,
// and "Now" appears only while the shop is open.
export const DeliverySlotPicker: React.FC = () => {
  const slotId = useCheckoutSession((s) => s.slotId);
  const setSlotId = useCheckoutSession((s) => s.setSlotId);
  const { slots, shopOpen, loading, error, refresh } = useDeliverySlots();

  // A slot that has passed or is no longer offered is cleared, so the customer picks again.
  useEffect(() => {
    if (!loading && !error && slotId && !slots.some((s) => s.id === slotId)) setSlotId(null);
  }, [loading, error, slotId, slots, setSlotId]);

  if (loading && slots.length === 0) {
    return <p className="commerce-muted">Loading delivery times...</p>;
  }
  if (error && slots.length === 0) {
    return (
      <div className="commerce-warn" role="alert">
        <p>{error}</p>
        <button type="button" className="commerce-link" onClick={refresh}>
          <RefreshCw size={13} /> Try again
        </button>
      </div>
    );
  }

  const express = slots.filter((s) => s.kind === 'express');
  const groups = (['today', 'tomorrow'] as const).map((day) => ({ day, items: slots.filter((s) => s.kind === 'window' && s.day === day) }));

  const option = (slot: DeliverySlotView) => {
    const chosen = slot.id === slotId;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={chosen}
        key={slot.id}
        className={chosen ? 'commerce-slot is-on' : 'commerce-slot'}
        onClick={() => setSlotId(slot.id)}
      >
        <span className="commerce-slot-title">
          {slot.kind === 'express' ? <Zap size={14} fill="currentColor" /> : <Clock size={14} />}
          {slot.kind === 'express' ? slot.label : slot.label.replace(/^(Today|Tomorrow), /, '')}
        </span>
        <small>{slot.estimate}</small>
      </button>
    );
  };

  return (
    <div className="commerce-slots" role="radiogroup" aria-label="Delivery time">
      {!shopOpen && <p className="commerce-muted">The shop is closed right now. Choose a time for today or tomorrow.</p>}
      {express.length > 0 && (
        <section aria-label="Express">
          <h3>Fastest</h3>
          <div className="commerce-slot-grid">{express.map(option)}</div>
        </section>
      )}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.day} aria-label={DAY_HEADING[g.day]}>
              <h3>{DAY_HEADING[g.day]}</h3>
              <div className="commerce-slot-grid">{g.items.map(option)}</div>
            </section>
          )
      )}
      <p className="commerce-muted commerce-slot-note">Times are estimates. We will do our best to deliver within the window you choose.</p>
    </div>
  );
};
