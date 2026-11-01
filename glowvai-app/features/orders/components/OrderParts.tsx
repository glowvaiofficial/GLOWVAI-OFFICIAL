import React from 'react';
import { Check, CheckCircle2, Clock3, Package, XCircle } from 'lucide-react';
import type { Order } from '../../../types';
import { ORDER_STAGES, STATUS_LABEL, formatOrderDate, stageIndex, statusTone } from '../lib/orderUtils';

/** Product thumbnails for an order. Items without a photo get a neutral tile, never a stock image. */
export const OrderThumbs: React.FC<{ order: Order; max?: number }> = ({ order, max = 4 }) => {
  const shown = order.items.slice(0, max);
  const extra = order.items.length - shown.length;
  return (
    <div className="orders-thumbs">
      {shown.map((item) =>
        item.imageUrl ? (
          <img key={`${item.productId}-${item.variantSize}`} src={item.imageUrl} alt="" />
        ) : (
          <span key={`${item.productId}-${item.variantSize}`} className="orders-thumb-empty" aria-hidden="true">
            <Package size={20} />
          </span>
        )
      )}
      {extra > 0 && <span className="orders-more-items">+{extra} more</span>}
    </div>
  );
};

export const StatusBadge: React.FC<{ order: Order }> = ({ order }) => {
  const tone = statusTone(order);
  return (
    <span className={`orders-badge is-${tone}`}>
      {tone === 'cancelled' ? <XCircle size={13} /> : tone === 'done' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
      {STATUS_LABEL[order.status]}
    </span>
  );
};

/** Compact horizontal progress for order cards. */
export const OrderProgressBar: React.FC<{ order: Order }> = ({ order }) => {
  const reached = stageIndex(order);
  return (
    <ol className="orders-progress" aria-label={`Order status: ${STATUS_LABEL[order.status]}`}>
      {ORDER_STAGES.map((label, idx) => {
        const state = idx < reached || reached === 3 ? 'is-done' : idx === reached ? 'is-current' : '';
        return (
          <li key={label} className={state}>
            <span className="orders-progress-dot">{state === 'is-done' ? <Check size={11} strokeWidth={3} /> : null}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
};

/** Vertical timeline used on the details and tracking screens. Only the placed time is known, so later stages show their state, not invented times. */
export const OrderTimeline: React.FC<{ order: Order }> = ({ order }) => {
  const reached = stageIndex(order);
  if (reached < 0) {
    return (
      <ol className="orders-timeline">
        <li className="is-done">
          <span className="orders-timeline-dot"><Check size={13} strokeWidth={3} /></span>
          <div><b>Placed</b><small>{formatOrderDate(order.createdAt)}</small></div>
        </li>
        <li className="is-cancelled">
          <span className="orders-timeline-dot"><XCircle size={14} /></span>
          <div><b>Cancelled</b><small>No delivery for this order</small></div>
        </li>
      </ol>
    );
  }
  return (
    <ol className="orders-timeline">
      {ORDER_STAGES.map((label, idx) => {
        const done = idx < reached || reached === 3;
        const current = idx === reached && reached < 3;
        const note = idx === 0 ? formatOrderDate(order.createdAt) : done ? 'Done' : current ? 'In progress' : 'Up next';
        return (
          <li key={label} className={done ? 'is-done' : current ? 'is-current' : ''}>
            <span className="orders-timeline-dot">{done ? <Check size={13} strokeWidth={3} /> : idx + 1}</span>
            <div><b>{label}</b><small>{note}</small></div>
          </li>
        );
      })}
    </ol>
  );
};

interface OrdersStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}

/** Honest empty or unavailable state for the order screens. */
export const OrdersState: React.FC<OrdersStateProps> = ({ icon, title, body, children }) => (
  <section className="orders-state">
    <span className="orders-state-icon" aria-hidden="true">{icon}</span>
    <h2>{title}</h2>
    <p>{body}</p>
    {children && <div className="orders-state-actions">{children}</div>}
  </section>
);
