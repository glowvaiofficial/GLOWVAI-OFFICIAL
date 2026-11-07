import React, { useEffect, useId, useState } from 'react';
import { Star } from 'lucide-react';
import type { ShopOrder, ShopOrderItem } from '../../../core/services/shopApi';
import { useCustomerStore } from '../../../core/state/customerStore';
import { fetchOwnReview, saveReview, type ReviewStatus } from '../../reviews/reviewsApi';
import { Stars, bodyText, buttonOutline, buttonPrimary, ink, inputStyle, muted, smallText } from '../../reviews/shared';
import { ratePromptFor, type ProductReviewState } from '../../../../lib/shop/orderHistory';
import { BODY_MAX, BODY_MIN, TITLE_MAX, validateReviewInput } from '../../../../lib/shop/reviewRules';
import { orderTone } from '../orderUtils';

// "Rate this product" for each product of a delivered order. The server decides who may review (verified purchase, one
// review per customer per product, a first name on the profile); the form only shows its answers and checks the text
// with the same rules the server uses (lib/shop/reviewRules.ts).

const STATUS_NOTE: Record<ReviewStatus, string> = {
  PENDING: 'Your review is being checked',
  APPROVED: 'Your review is published',
  REJECTED: 'Your review was not published',
};

export interface ReviewFormResult {
  rating: number;
  status: ReviewStatus;
}

// Star rating (keyboard and screen-reader accessible radio group), optional title, required body.
export const RateProductForm: React.FC<{
  productId: string;
  productName: string;
  editing: boolean;
  onSaved: (result: ReviewFormResult) => void;
  onCancel: () => void;
}> = ({ productId, productName, editing, onSaved, onCancel }) => {
  const ids = useId();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; title?: string; body?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editing);

  // Editing: fill the form with the review already posted.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    void fetchOwnReview(productId).then((res) => {
      if (!alive) return;
      if (res.ok && res.data?.review) {
        setRating(res.data.review.rating);
        setTitle(res.data.review.title ?? '');
        setBody(res.data.review.body ?? '');
      } else {
        setFormError(res.error || 'Your review could not be opened. Try again.');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [editing, productId]);

  const lowRating = rating > 0 && rating <= 2;

  // The checks a customer can act on, each under its own field. The shared rules run last for anything they catch.
  const checkFields = () => {
    const next: { rating?: string; title?: string; body?: string } = {};
    if (rating < 1) next.rating = 'Choose a rating from 1 to 5 stars.';
    if (title.trim().length > TITLE_MAX) next.title = `Keep the title to ${TITLE_MAX} characters or fewer.`;
    const len = body.trim().length;
    if (len < BODY_MIN) {
      next.body = lowRating
        ? `Tell us what went wrong. A review for 1 or 2 stars needs at least ${BODY_MIN} characters.`
        : `Write at least ${BODY_MIN} characters about the product.`;
    } else if (len > BODY_MAX) next.body = `Keep the review to ${BODY_MAX} characters or fewer.`;
    if (Object.keys(next).length === 0) {
      const checked = validateReviewInput({ rating, title, body });
      if (!checked.ok) next.body = checked.error;
    }
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setMessage(null);
    const found = checkFields();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    const res = await saveReview({ productId, rating, title: title.trim(), body: body.trim() }, editing);
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setFormError(res.error || 'Your review could not be sent. Try again.');
      return;
    }
    setMessage(res.data.message);
    onSaved({ rating, status: res.data.status });
    // The customer's order list and detail screens hold the review state from the server; refresh them.
    void useCustomerStore.getState().loadOrders();
  };

  if (loading) return <p style={smallText} role="status">Opening your review…</p>;

  const fieldError = (key: keyof typeof errors, id: string) =>
    errors[key] ? (
      <span id={`${id}-error`} role="alert" style={{ ...smallText, color: '#B42318' }}>
        {errors[key]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} noValidate aria-label={`${editing ? 'Edit your review' : 'Rate'} ${productName}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }} aria-describedby={errors.rating ? `${ids}-rating-error` : undefined}>
        <legend style={{ ...smallText, color: ink, fontWeight: 700, padding: 0, marginBottom: '6px' }}>Your rating</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '10px',
                border: `1.5px solid ${rating === n ? '#2854C5' : '#E2E5EB'}`,
                cursor: 'pointer',
                ...bodyText,
                color: ink,
              }}
            >
              <input type="radio" name={`${ids}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} />
              <Star size={14} color="#F59E0B" fill={n <= rating ? '#F59E0B' : 'none'} aria-hidden="true" />
              <span>{n} {n === 1 ? 'star' : 'stars'}</span>
            </label>
          ))}
        </div>
        {fieldError('rating', `${ids}-rating`)}
      </fieldset>

      <label htmlFor={`${ids}-title`} style={smallText}>
        Title (optional, up to {TITLE_MAX} characters)
      </label>
      <input
        id={`${ids}-title`}
        value={title}
        maxLength={TITLE_MAX + 20}
        onChange={(e) => setTitle(e.target.value)}
        aria-invalid={Boolean(errors.title)}
        aria-describedby={errors.title ? `${ids}-title-error` : undefined}
        style={inputStyle}
      />
      {fieldError('title', `${ids}-title`)}

      <label htmlFor={`${ids}-body`} style={smallText}>
        {lowRating ? 'What went wrong? (required)' : 'Your review'}
      </label>
      <textarea
        id={`${ids}-body`}
        value={body}
        rows={4}
        maxLength={BODY_MAX + 50}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={Boolean(errors.body)}
        aria-describedby={`${ids}-count ${errors.body ? `${ids}-body-error` : ''}`.trim()}
        style={{ ...inputStyle, minHeight: '96px', resize: 'vertical' }}
      />
      <span id={`${ids}-count`} style={{ ...smallText, color: muted }}>
        {body.trim().length} / {BODY_MAX} characters. At least {BODY_MIN}.
      </span>
      {fieldError('body', `${ids}-body`)}

      {formError && (
        <p role="alert" style={{ ...smallText, color: '#B42318', margin: 0 }}>
          {formError}
        </p>
      )}
      {message && (
        <p role="status" style={{ ...bodyText, color: ink, fontWeight: 700, margin: 0 }}>
          {message}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="submit" style={buttonPrimary} disabled={submitting}>
          {submitting ? 'Sending…' : editing ? 'Save changes' : 'Submit review'}
        </button>
        <button type="button" style={buttonOutline} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
      <span style={{ ...smallText, color: muted }}>Reviews are shown after our team has checked them.</span>
    </form>
  );
};

// One product of a delivered order: the prompt, or the customer's review and its status.
const ProductRateRow: React.FC<{ order: ShopOrder; item: ShopOrderItem; delivered: boolean }> = ({ order, item, delivered }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<ProductReviewState | null>(null);
  const fromServer = order.reviews?.[item.productId];
  const review: ProductReviewState | null = local ?? (fromServer ? { status: fromServer.status, rating: fromServer.rating, canEdit: fromServer.canEdit } : null);
  const prompt = ratePromptFor(delivered, review);
  const label = item.title || 'this product';

  if (prompt.kind === 'none') return null;

  return (
    <div className="orders-rate-row" style={{ padding: '10px 0', borderTop: '1px solid #E2E5EB' }}>
      <strong style={{ fontSize: '13px', color: ink }}>{label}</strong>
      {prompt.kind === 'rate' && !open && (
        <div style={{ marginTop: '6px' }}>
          <button type="button" style={buttonOutline} aria-expanded={false} aria-label={`Rate this product: ${label}`} onClick={() => setOpen(true)}>
            Rate this product
          </button>
        </div>
      )}
      {prompt.kind === 'rate' && open && (
        <RateProductForm
          productId={item.productId}
          productName={label}
          editing={false}
          onCancel={() => setOpen(false)}
          onSaved={({ rating, status }) => {
            setLocal({ status, rating, canEdit: true });
            setOpen(false);
          }}
        />
      )}
      {prompt.kind === 'reviewed' && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Stars value={prompt.review.rating} size={13} />
            <span style={smallText}>{prompt.review.rating} of 5</span>
          </span>
          <span style={{ ...smallText, color: ink, fontWeight: 700 }}>{STATUS_NOTE[prompt.review.status]}</span>
          {prompt.review.canEdit && !editing && (
            <button type="button" style={{ ...buttonOutline, alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>
              Edit review
            </button>
          )}
          {editing && (
            <RateProductForm
              productId={item.productId}
              productName={label}
              editing
              onCancel={() => setEditing(false)}
              onSaved={({ rating, status }) => {
                setLocal({ status, rating, canEdit: false });
                setEditing(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Every product of a delivered order, once each. Nothing is shown for an order that is not delivered.
export const RateProductsSection: React.FC<{ order: ShopOrder }> = ({ order }) => {
  if (orderTone(order) !== 'delivered') return null;
  const seen = new Set<string>();
  const items = order.items.filter((item) => {
    if (!item.productId || seen.has(item.productId)) return false;
    seen.add(item.productId);
    return true;
  });
  if (items.length === 0) return null;
  return (
    <section aria-label={`Rate the products in order ${order.orderId}`} className="orders-rate-products" style={{ marginTop: '10px' }}>
      <h3 style={{ fontSize: '13px', color: ink, margin: '0 0 2px' }}>Rate your products</h3>
      {items.map((item) => (
        <ProductRateRow key={item.productId} order={order} item={item} delivered />
      ))}
    </section>
  );
};
