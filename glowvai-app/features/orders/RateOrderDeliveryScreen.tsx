import React, { useState } from 'react';
import { Check, MessageCircle, MessageSquare, Star } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { openWhatsAppSupport } from '../../core/utils/whatsapp';
import { OrdersHeader } from './components/OrdersHeader';
import { OrderThumb, OrdersEmpty, formatOrderDate, itemCountLabel, orderTone, useRequestedOrder } from './orderUtils';

const DELIVERY_TAGS = ['On time', 'Friendly', 'Careful with the bag', 'Easy to reach'];
const PRODUCT_TAGS = ['Sealed packaging', 'Matched the listing', 'Good value'];
const RATING_WORDS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

const toggle = (list: string[], tag: string) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);

interface StarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const StarRow: React.FC<StarRowProps> = ({ label, value, onChange }) => (
  <div className="orders-stars" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" role="radio" aria-checked={star === value} aria-label={`${star} star${star === 1 ? '' : 's'}`} onClick={() => onChange(star)}>
        <Star size={30} fill={star <= value ? '#f5a623' : 'transparent'} color={star <= value ? '#f5a623' : '#b8bfcc'} />
      </button>
    ))}
    <span className="orders-score">{value ? RATING_WORDS[value] : 'Tap to rate'}</span>
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
      const isOn = selected.includes(tag);
      return (
        <button key={tag} type="button" className={`orders-tag${isOn ? ' is-selected' : ''}`} aria-pressed={isOn} onClick={() => onToggle(tag)}>
          {isOn && <Check size={12} />}
          {tag}
        </button>
      );
    })}
  </div>
);

export const RateOrderDeliveryScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const { order, requestedId } = useRequestedOrder();
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [deliveryTags, setDeliveryTags] = useState<string[]>([]);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [sentToWhatsApp, setSentToWhatsApp] = useState(false);

  if (!order || orderTone(order) !== 'delivered') {
    return (
      <main className="orders-screen is-rate is-empty">
        <OrdersHeader title="Rate your order" onBack={goBack} />
        <div className="orders-body">
          <OrdersEmpty
            title={order ? 'Not delivered yet' : requestedId ? 'Order not found' : 'Nothing to rate yet'}
            body={order ? 'You can rate this order once it has been delivered.' : 'Delivered orders can be rated from your orders page.'}
            actionLabel="See my orders"
            onAction={() => navigate('orders-list')}
          />
        </div>
      </main>
    );
  }

  const placed = formatOrderDate(order.createdAt);
  const canSend = deliveryRating > 0 || productRating > 0;

  const sendFeedback = () => {
    const lines = [
      `Feedback for GlowVai order #${order.id}`,
      deliveryRating ? `Delivery: ${deliveryRating}/5${deliveryTags.length ? ` (${deliveryTags.join(', ')})` : ''}` : '',
      productRating ? `Products: ${productRating}/5${productTags.length ? ` (${productTags.join(', ')})` : ''}` : '',
      comment.trim() ? `Comments: ${comment.trim()}` : '',
    ].filter(Boolean);
    openWhatsAppSupport(lines.join('\n'));
    setSentToWhatsApp(true);
  };

  return (
    <main className="orders-screen is-rate">
      <OrdersHeader title="Rate your order" subtitle={`#${order.id}`} onBack={goBack} />

      <div className="orders-body">
        <section className="orders-card orders-summary-card">
          <div className="orders-thumbs">
            {order.items.slice(0, 3).map((item) => (
              <OrderThumb key={`${item.productId}-${item.variantSize}`} item={item} />
            ))}
          </div>
          <div>
            <strong>#{order.id}</strong>
            <span>
              {itemCountLabel(order)}
              {placed ? ` · Placed ${placed}` : ''}
            </span>
          </div>
        </section>

        <section className="orders-card orders-rate-card">
          <h2>How was the delivery?</h2>
          <StarRow label="Delivery rating" value={deliveryRating} onChange={setDeliveryRating} />
          <TagRow tags={DELIVERY_TAGS} selected={deliveryTags} onToggle={(tag) => setDeliveryTags(toggle(deliveryTags, tag))} />
        </section>

        <section className="orders-card orders-rate-card">
          <h2>How are the products?</h2>
          <StarRow label="Product rating" value={productRating} onChange={setProductRating} />
          <TagRow tags={PRODUCT_TAGS} selected={productTags} onToggle={(tag) => setProductTags(toggle(productTags, tag))} />
        </section>

        <section className="orders-card orders-comment-card">
          <div className="orders-comment-head">
            <MessageSquare size={16} />
            <b>Tell us more (optional)</b>
            <span>{comment.length}/250</span>
          </div>
          <textarea
            aria-label="Feedback"
            placeholder="Packaging, delivery or product quality…"
            rows={3}
            maxLength={250}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </section>

        <div className="orders-rate-actions">
          {sentToWhatsApp && (
            <p className="orders-info-note" role="status">
              WhatsApp opened with your feedback. Press send there to share it with our team.
            </p>
          )}
          <p className="orders-note">Feedback is shared with our support team on WhatsApp.</p>
          <button type="button" className="orders-primary-button is-block" disabled={!canSend} onClick={sendFeedback}>
            <MessageCircle size={16} /> {sentToWhatsApp ? 'Open WhatsApp again' : 'Send feedback on WhatsApp'}
          </button>
          <button type="button" className="orders-secondary-button is-block" onClick={goBack}>
            {sentToWhatsApp ? 'Done' : 'Not now'}
          </button>
        </div>
      </div>
    </main>
  );
};
