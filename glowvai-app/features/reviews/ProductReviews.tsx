import React, { useEffect, useId, useState } from 'react';
import {
  fetchOwnReview,
  fetchReviews,
  saveReview,
  type OwnReviewState,
  type PublicReview,
  type RatingSummary,
  type ReviewSort,
} from './reviewsApi';
import { Stars, accent, bodyText, buttonOutline, buttonPrimary, formatDay, ink, inputStyle, line, muted, sectionTitle, smallText, srOnly } from './shared';

const SORTS: Array<{ id: ReviewSort; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'highest', label: 'Highest rated' },
  { id: 'lowest', label: 'Lowest rated' },
];

const STATUS_TEXT: Record<string, string> = {
  PENDING: 'Waiting for our team to check it. It is not shown on this page yet.',
  APPROVED: 'Shown on this page.',
  REJECTED: 'Not shown on this page.',
};

// The product's reviews: the server's rating summary, the approved reviews (sortable, 20 at a time), and the form to
// write one. Nothing here is computed in the browser: the average and count are exactly what the server returned.
export function ProductReviews({ productId }: { productId: string }) {
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [writing, setWriting] = useState(false);
  const sortId = useId();
  const formId = useId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMoreError(null);
    fetchReviews(productId, sort).then((r) => {
      if (cancelled) return;
      if (r.ok && r.data) {
        setSummary(r.data.rating);
        setReviews(r.data.reviews);
        setNextCursor(r.data.nextCursor);
      } else {
        setSummary(null);
        setReviews([]);
        setNextCursor(null);
        setLoadError(r.error ?? 'We could not load the reviews. Try again in a moment.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, sort, attempt]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setMoreError(null);
    const r = await fetchReviews(productId, sort, nextCursor);
    if (r.ok && r.data) {
      setReviews((prev) => [...prev, ...r.data!.reviews]);
      setNextCursor(r.data.nextCursor);
    } else {
      setMoreError(r.error ?? 'We could not load more reviews. Try again.');
    }
    setLoadingMore(false);
  }

  const count = summary?.count ?? 0;
  const average = summary?.average ?? null;

  return (
    <section aria-labelledby={`${formId}-title`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 id={`${formId}-title`} style={sectionTitle}>Ratings and reviews</h3>

      {loading && <p role="status" style={smallText}>Loading reviews...</p>}

      {!loading && loadError && (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <p style={bodyText}>{loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} style={buttonOutline}>Try again</button>
        </div>
      )}

      {!loading && !loadError && count === 0 && (
        <p style={bodyText}>No reviews yet. Be the first to review after your order is delivered.</p>
      )}

      {!loading && !loadError && count > 0 && average !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Stars value={average} size={18} />
          <p style={{ ...bodyText, color: ink }}>
            <strong>{average.toFixed(1)}</strong> out of 5 from {count} {count === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      )}

      {!loading && !loadError && count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor={sortId} style={smallText}>Sort reviews</label>
          <select
            id={sortId}
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            style={{ height: '34px', borderRadius: '8px', border: `1px solid #CBD5E1`, padding: '0 8px', fontSize: '13px', color: ink, backgroundColor: '#FFFFFF' }}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {!loading && !loadError && reviews.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reviews.map((r) => (
            <li key={r.id} style={{ borderTop: `1px solid ${line}`, paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stars value={r.rating} size={14} />
                <span style={srOnly}>Rated {r.rating} out of 5</span>
                {r.title && <p style={{ fontSize: '14px', fontWeight: 700, color: ink, margin: 0 }}>{r.title}</p>}
              </div>
              <p style={{ ...bodyText, marginTop: '6px', whiteSpace: 'pre-line' }}>{r.body}</p>
              <p style={{ ...smallText, marginTop: '6px' }}>
                {r.displayName || 'Customer'} · <span style={{ color: '#15803D', fontWeight: 600 }}>Verified purchase</span> · {formatDay(r.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}

      {!loading && !loadError && nextCursor && (
        <div>
          <button type="button" onClick={loadMore} disabled={loadingMore} style={buttonOutline}>
            {loadingMore ? 'Loading...' : 'Load more reviews'}
          </button>
          {moreError && <p role="alert" style={{ ...smallText, color: '#B91C1C', marginTop: '8px' }}>{moreError}</p>}
        </div>
      )}

      {!loading && !loadError && (
        <div style={{ borderTop: `1px solid ${line}`, paddingTop: '16px' }}>
          <button
            type="button"
            aria-expanded={writing}
            aria-controls={formId}
            onClick={() => setWriting((v) => !v)}
            style={buttonOutline}
          >
            {writing ? 'Close review form' : 'Write a review'}
          </button>
          <div id={formId} hidden={!writing} style={{ marginTop: '16px' }}>
            {writing && <ReviewForm productId={productId} />}
          </div>
        </div>
      )}
    </section>
  );
}

type Eligibility =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; state: OwnReviewState };

// The form. The server decides whether this customer may write: when it says no, the reason is shown and every field is
// disabled. The customer's name and verified purchase are never sent from here; the server reads them itself.
function ReviewForm({ productId }: { productId: string }) {
  const [eligibility, setEligibility] = useState<Eligibility>({ status: 'loading' });
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const ids = useId();

  useEffect(() => {
    let cancelled = false;
    setEligibility({ status: 'loading' });
    fetchOwnReview(productId).then((r) => {
      if (cancelled) return;
      if (r.ok && r.data) setEligibility({ status: 'ready', state: r.data });
      else setEligibility({ status: 'error', message: r.error ?? 'We could not check your orders. Try again in a moment.' });
    });
    return () => {
      cancelled = true;
    };
  }, [productId, checkAttempt]);

  // An existing review is edited in place: fill the form with it once.
  useEffect(() => {
    if (eligibility.status !== 'ready' || !eligibility.state.review) return;
    const review = eligibility.state.review;
    if (prefilledFor === review.id) return;
    setPrefilledFor(review.id);
    setRating(review.rating);
    setTitle(review.title);
    setBody(review.body);
  }, [eligibility, prefilledFor]);

  if (eligibility.status === 'loading') {
    return <p role="status" style={smallText}>Checking your orders...</p>;
  }
  if (eligibility.status === 'error') {
    return (
      <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        <p style={bodyText}>{eligibility.message}</p>
        <button type="button" onClick={() => setCheckAttempt((n) => n + 1)} style={buttonOutline}>Try again</button>
      </div>
    );
  }

  const { review, canWrite, reason } = eligibility.state;
  const editing = Boolean(review) && canWrite;
  const disabled = !canWrite || submitting;
  const canSubmit = !disabled && rating >= 1 && rating <= 5 && body.trim().length >= 10 && body.trim().length <= 1000;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage(null);
    const r = await saveReview({ productId, rating, title, body }, editing);
    setSubmitting(false);
    if (r.ok && r.data) {
      setMessage({ kind: 'ok', text: r.data.message });
      setEligibility({ status: 'loading' });
      setCheckAttempt((n) => n + 1);
    } else {
      setMessage({ kind: 'error', text: r.error ?? 'We could not save your review. Try again.' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {review && (
        <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F7F8FB', border: `1px solid ${line}` }}>
          <p style={{ ...bodyText, color: ink, fontWeight: 700 }}>Your review: {review.status === 'APPROVED' ? 'published' : review.status === 'PENDING' ? 'waiting for checks' : 'not published'}</p>
          <p style={{ ...smallText, marginTop: '4px' }}>{STATUS_TEXT[review.status]}</p>
          {review.status === 'REJECTED' && review.rejectionReason && (
            <p style={{ ...smallText, marginTop: '6px', color: '#92400E' }}>Reason: {review.rejectionReason}</p>
          )}
          {review.editable && (
            <p style={{ ...smallText, marginTop: '6px' }}>
              You can edit it once until {formatDay(review.editDeadline)}. Editing sends it back for checking.
            </p>
          )}
        </div>
      )}

      {reason && !canWrite && (
        <p role="note" style={{ ...bodyText, padding: '12px 14px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          {reason}
        </p>
      )}

      <form onSubmit={submit} aria-labelledby={`${ids}-legend`} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <fieldset disabled={disabled} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <legend id={`${ids}-legend`} style={{ ...sectionTitle, marginBottom: '8px' }}>
            {editing ? 'Edit your review' : 'Write a review'}
          </legend>

          <div role="radiogroup" aria-label="Your rating" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${rating === n ? accent : '#CBD5E1'}`,
                  backgroundColor: rating === n ? '#F0F7FF' : '#FFFFFF',
                  color: ink,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <input type="radio" name={`${ids}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} />
                <Stars value={n} size={14} />
                <span>{n} {n === 1 ? 'star' : 'stars'}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${ids}-title`} style={smallText}>Title (optional)</label>
            <input
              id={`${ids}-title`}
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${ids}-body`} style={smallText}>Your review</label>
            <textarea
              id={`${ids}-body`}
              value={body}
              rows={5}
              maxLength={1000}
              onChange={(e) => setBody(e.target.value)}
              aria-describedby={`${ids}-count`}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <span id={`${ids}-count`} style={{ ...smallText, textAlign: 'right' }}>
              {body.length}/1000. At least 10 characters. Links and contact details are not allowed.
            </span>
          </div>
        </fieldset>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="submit" disabled={!canSubmit} style={{ ...buttonPrimary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Sending...' : editing ? 'Save changes' : 'Submit review'}
          </button>
          <div role={message?.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
            {message && (
              <p style={{ ...bodyText, color: message.kind === 'error' ? '#B91C1C' : '#15803D' }}>{message.text}</p>
            )}
          </div>
        </div>
      </form>
      <span style={{ ...smallText, color: muted }}>Reviews are shown after our team has checked them.</span>
    </div>
  );
}
