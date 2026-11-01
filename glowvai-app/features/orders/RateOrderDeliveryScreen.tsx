import React, { useState } from 'react';
import { Check, CheckCircle2, MessageSquare, PackageOpen, Star, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { OrdersHeader } from './components/OrdersHeader';
import { OrderThumbs, OrdersState } from './components/OrderParts';
import { formatOrderDay, loadRatings, saveRating } from './lib/orderUtils';

const DELIVERY_TAGS = ['Friendly', 'On time', 'Careful with the bag', 'Easy to reach'];
const PRODUCT_TAGS = ['Well packed', 'Matches the listing', 'Fresh stock', 'Good value'];
const RATING_WORDS = ['', 'Poor', 'Could be better', 'Okay', 'Good', 'Great'];

const toggle = (list: string[], tag: string) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);

interface StarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const StarRow: React.FC<StarRowProps> = ({ label, value, onChange }) => (
  <div className="orders-stars-wrap">
    <div className="orders-stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" role="radio" aria-checked={star === value} aria-label={`${star} star${star === 1 ? '' : 's'}`} className={star <= value ? 'is-on' : ''} onClick={() => onChange(star)}>
          <Star size={30} fill={star <= value ? 'currentColor' : 'transparent'} />
        </button>
      ))}
    </div>
    <span className="orders-score">{value ? RATING_WORDS[value] : 'Tap a star'}</span>
  </div>
);

interface TagRowProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

const TagRow: React.FC<TagRowProps> = ({ tags, selected, onToggle }) => (
  <div className="orders-tags">
    {tags.map((tag) => {
      const on = selected.includes(tag);
      return (
        <button key={tag} type="button" className={`orders-tag${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={() => onToggle(tag)}>
          {on && <Check size={12} />}
          {tag}
        </button>
      );
    })}
  </div>
);

export const RateOrderDeliveryScreen: React.FC = () => {
  const { goBack, navigate, activeParams, orders } = useApp();
  const requestedId: string | undefined = activeParams?.orderId || activeParams?.id;
  const order = requestedId ? orders.find((o) => o.id === requestedId) ?? null : orders.find((o) => o.status === 'delivered') ?? null;
  const existing = order ? loadRatings()[order.id] : undefined;

  const [deliveryRating, setDeliveryRating] = useState(existing?.delivery ?? 0);
  const [productRating, setProductRating] = useState(existing?.products ?? 0);
  const [deliveryTags, setDeliveryTags] = useState<string[]>(existing?.tags.filter((t) => DELIVERY_TAGS.includes(t)) ?? []);
  const [productTags, setProductTags] = useState<string[]>(existing?.tags.filter((t) => PRODUCT_TAGS.includes(t)) ?? []);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [submitted, setSubmitted] = useState(false);

  if (!order) {
    return (
      <main className="orders-screen is-rate">
        <OrdersHeader title="Rate your order" onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<PackageOpen size={30} />} title="Nothing to rate yet" body="You can rate an order after it has been delivered.">
            <button className="orders-primary-button" onClick={() => navigate('orders-list')}>Your orders</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  if (order.status !== 'delivered') {
    return (
      <main className="orders-screen is-rate">
        <OrdersHeader title="Rate your order" subtitle={`#${order.id}`} onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<Truck size={30} />} title="Not delivered yet" body={`You can rate order #${order.id} once it has been delivered.`}>
            <button className="orders-secondary-button" onClick={() => navigate('orders-detail', { orderId: order.id })}>Order details</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  const riderName = order.fulfilmentTasks?.[0]?.riderName;
  const canSubmit = deliveryRating > 0 || productRating > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    saveRating(order.id, {
      delivery: deliveryRating,
      products: productRating,
      tags: [...deliveryTags, ...productTags],
      comment: comment.trim(),
      ratedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  return (
    <main className="orders-screen is-rate">
      <OrdersHeader title="Rate your order" subtitle={`#${order.id}`} onBack={goBack} />

      <div className="orders-content">
        {submitted ? (
          <OrdersState icon={<CheckCircle2 size={34} />} title="Thanks for rating" body="Your rating for this order is saved on this device.">
            <button className="orders-primary-button" onClick={() => navigate('orders-list')}>Back to your orders</button>
          </OrdersState>
        ) : (
          <div className="orders-rate-form">
            <section className="orders-card orders-rate-summary">
              <OrderThumbs order={order} max={3} />
              <div>
                <strong>{order.items.length === 1 ? order.items[0].productName : `${order.items.length} products`}</strong>
                <span>Ordered {formatOrderDay(order.createdAt)} · {order.address.label}</span>
              </div>
            </section>

            <section className="orders-card orders-rate-card">
              <h2>How was the delivery?</h2>
              <p className="orders-rate-sub">{riderName ? `Delivered by ${riderName}` : 'Rate the delivery experience'}</p>
              <StarRow label="Delivery rating" value={deliveryRating} onChange={setDeliveryRating} />
              <TagRow tags={DELIVERY_TAGS} selected={deliveryTags} onToggle={(tag) => setDeliveryTags(toggle(deliveryTags, tag))} />
            </section>

            <section className="orders-card orders-rate-card">
              <h2>How are the products?</h2>
              <p className="orders-rate-sub">Packaging, freshness and value</p>
              <StarRow label="Product rating" value={productRating} onChange={setProductRating} />
              <TagRow tags={PRODUCT_TAGS} selected={productTags} onToggle={(tag) => setProductTags(toggle(productTags, tag))} />
            </section>

            <section className="orders-card orders-comment-card">
              <label className="orders-comment-head" htmlFor="orders-rate-comment">
                <MessageSquare size={16} />
                <b>Anything else? (optional)</b>
                <span>{comment.length}/250</span>
              </label>
              <textarea
                id="orders-rate-comment"
                placeholder="Packaging, speed or product quality"
                rows={3}
                maxLength={250}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </section>

            <div className="orders-rate-actions">
              <button className="orders-primary-button is-block" onClick={handleSubmit} disabled={!canSubmit}>
                Submit rating
              </button>
              <button className="orders-secondary-button is-block is-quiet" onClick={goBack}>
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
