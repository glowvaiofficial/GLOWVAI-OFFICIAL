import React, { useState } from 'react';
import { Check, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { OrdersHeader } from './components/OrdersHeader';

const RIDER_TAGS = ['Friendly', 'Fast', 'Careful', 'Professional'];
const PRODUCT_TAGS = ['Fresh packaging', 'Loved the product', 'Great value'];
const THUMBS = [
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=150&q=80',
];

const toggle = (list: string[], tag: string) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);

interface StarRowProps {
  value: number;
  onChange: (value: number) => void;
}

const StarRow: React.FC<StarRowProps> = ({ value, onChange }) => (
  <div className="orders-stars" role="radiogroup">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" role="radio" aria-checked={star === value} aria-label={`${star} stars`} onClick={() => onChange(star)}>
        <Star size={32} fill={star <= value ? '#FFD700' : 'transparent'} color="#FFD700" />
      </button>
    ))}
    <span className="orders-score">{value}.0</span>
  </div>
);

export const RateOrderDeliveryScreen: React.FC = () => {
  const { goBack, navigate, activeParams } = useApp();
  const orderId: string = activeParams?.orderId || activeParams?.id || 'GV28491';
  const [riderRating, setRiderRating] = useState(5);
  const [productRating, setProductRating] = useState(5);
  const [riderTags, setRiderTags] = useState<string[]>(['Friendly', 'Fast']);
  const [productTags, setProductTags] = useState<string[]>(['Fresh packaging']);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigate('orders-list'), 1200);
  };

  return (
    <main className="orders-screen is-rate">
      <OrdersHeader title="Rate Delivery & Products" onBack={goBack} />

      <div className="orders-body">
        {submitted ? (
          <section className="orders-thanks">
            <span className="orders-thanks-icon">
              <CheckCircle2 size={40} />
            </span>
            <h2>Thank you!</h2>
            <p>Your feedback helps us deliver a better GlowVAI experience, every time.</p>
          </section>
        ) : (
          <>
            <section className="orders-card orders-summary-card">
              <div className="orders-thumbs">
                {THUMBS.map((url, i) => (
                  <img key={i} src={url} alt="" />
                ))}
              </div>
              <div>
                <strong>#{orderId}</strong>
                <span>Delivered 4:32 PM · Apr 26, 2025</span>
              </div>
            </section>

            <section className="orders-card orders-rate-card">
              <h2>Rate your delivery partner</h2>
              <div className="orders-rider-line">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="" />
                <div>
                  <b>Rahul</b>
                  <small>GlowVAI Express Rider</small>
                </div>
              </div>
              <StarRow value={riderRating} onChange={setRiderRating} />
              <div className="orders-tags">
                {RIDER_TAGS.map((tag) => {
                  const selected = riderTags.includes(tag);
                  return (
                    <button key={tag} type="button" className={`orders-tag ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => setRiderTags(toggle(riderTags, tag))}>
                      {selected && <Check size={12} />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="orders-card orders-rate-card">
              <h2>How do you like your products?</h2>
              <StarRow value={productRating} onChange={setProductRating} />
              <div className="orders-tags">
                {PRODUCT_TAGS.map((tag) => {
                  const selected = productTags.includes(tag);
                  return (
                    <button key={tag} type="button" className={`orders-tag is-plum ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => setProductTags(toggle(productTags, tag))}>
                      {selected && <Check size={12} />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="orders-card orders-comment-card">
              <div className="orders-comment-head">
                <MessageSquare size={16} />
                <b>Tell us more (optional)</b>
                <span>{comment.length}/250</span>
              </div>
              <textarea
                aria-label="Feedback"
                placeholder="Share feedback on packaging, speed, or product quality..."
                rows={3}
                maxLength={250}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </section>

            <button className="orders-primary-button is-block" onClick={handleSubmit}>
              Submit Rating
            </button>
            <button className="orders-secondary-button is-block" onClick={goBack}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </main>
  );
};
