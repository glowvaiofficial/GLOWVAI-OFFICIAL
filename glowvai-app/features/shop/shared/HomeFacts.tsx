import React from 'react';
import { Banknote, ChevronRight, Clock, RotateCcw, Truck } from 'lucide-react';
import { VIJAYAWADA_AREAS } from '../../../data/serviceability';
import { FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { RETURN_WINDOW_DAYS } from '@/lib/shop/settings/rules';

// The trust and delivery strip under the first screen. Facts only, each one read from data the product already has:
// the delivery areas (data/serviceability.ts), the free delivery rule (pricing-rules.mjs), cash on delivery (the
// checkout's own method) and the return window (lib/shop/settings/rules.ts). No ratings, counts or testimonials.
const QUICK_AREAS = VIJAYAWADA_AREAS.filter((a) => a.quickCommerceAvailable);
const FASTEST = QUICK_AREAS.length > 0 ? Math.min(...QUICK_AREAS.map((a) => a.estimatedMinutes)) : 0;

export function HomeFacts({ variant, deliveryEta, onReturns }: { variant: 'desk' | 'phone'; deliveryEta: number | null; onReturns: () => void }) {
  return (
    <section className={`gv7-facts is-${variant}`} aria-label="Delivery and payment facts">
      <ul>
        <li>
          <Clock size={20} aria-hidden="true" />
          <span>
            <strong>{deliveryEta ? `Delivery in ~${deliveryEta} mins` : 'Delivery in Vijayawada'}</strong>
            <small>{deliveryEta ? 'To your selected address' : `${QUICK_AREAS.length} areas, from ${FASTEST} mins`}</small>
          </span>
        </li>
        <li>
          <Truck size={20} aria-hidden="true" />
          <span>
            <strong>Free delivery</strong>
            <small>On orders above ₹{FREE_DELIVERY_ABOVE}</small>
          </span>
        </li>
        <li>
          <Banknote size={20} aria-hidden="true" />
          <span>
            <strong>Cash on delivery</strong>
            <small>Pay after you receive your order</small>
          </span>
        </li>
        <li className="is-link">
          <button type="button" className="gv7-facts-link" onClick={onReturns}>
            <RotateCcw size={20} aria-hidden="true" />
            <span>
              <strong>Easy returns</strong>
              <small>{RETURN_WINDOW_DAYS}-day return window</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="gv7-facts-go" />
          </button>
        </li>
      </ul>
    </section>
  );
}
