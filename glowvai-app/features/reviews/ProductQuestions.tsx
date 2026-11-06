import React, { useEffect, useId, useState } from 'react';
import { askQuestion, fetchQuestions, type PublicQuestion } from './reviewsApi';
import { bodyText, buttonOutline, buttonPrimary, formatDay, ink, inputStyle, line, smallText, sectionTitle } from './shared';

const QUESTION_MIN = 10;
const QUESTION_MAX = 300;

// Approved questions about the product, each with the GlowVai team's answer when there is one. Anyone may ask; the
// question shows once a moderator has approved it.
export function ProductQuestions({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [asking, setAsking] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const headingId = useId();
  const formId = useId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchQuestions(productId).then((r) => {
      if (cancelled) return;
      if (r.ok && r.data) {
        setQuestions(r.data.questions);
        setNextCursor(r.data.nextCursor);
      } else {
        setQuestions([]);
        setNextCursor(null);
        setLoadError(r.error ?? 'We could not load the questions. Try again in a moment.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, attempt]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setMoreError(null);
    const r = await fetchQuestions(productId, nextCursor);
    if (r.ok && r.data) {
      setQuestions((prev) => [...prev, ...r.data!.questions]);
      setNextCursor(r.data.nextCursor);
    } else {
      setMoreError(r.error ?? 'We could not load more questions. Try again.');
    }
    setLoadingMore(false);
  }

  return (
    <section aria-labelledby={headingId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 id={headingId} style={sectionTitle}>Questions and answers</h3>

      {loading && <p role="status" style={smallText}>Loading questions...</p>}

      {!loading && loadError && (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <p style={bodyText}>{loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} style={buttonOutline}>Try again</button>
        </div>
      )}

      {!loading && !loadError && questions.length === 0 && (
        <p style={bodyText}>No questions yet. Ask the first question about this product.</p>
      )}

      {!loading && !loadError && questions.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {questions.map((q) => (
            <li key={q.id} style={{ borderTop: `1px solid ${line}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: ink, margin: 0 }}>{q.text}</p>
              <p style={smallText}>Asked by {q.askedBy || 'a shopper'} · {formatDay(q.createdAt)}</p>
              {q.answer && (
                <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F7F8FB', border: `1px solid ${line}` }}>
                  <p style={{ ...smallText, fontWeight: 700, color: ink }}>Answer from {q.answer.by}</p>
                  <p style={{ ...bodyText, marginTop: '4px', whiteSpace: 'pre-line' }}>{q.answer.text}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && !loadError && nextCursor && (
        <div>
          <button type="button" onClick={loadMore} disabled={loadingMore} style={buttonOutline}>
            {loadingMore ? 'Loading...' : 'Load more questions'}
          </button>
          {moreError && <p role="alert" style={{ ...smallText, color: '#B91C1C', marginTop: '8px' }}>{moreError}</p>}
        </div>
      )}

      {!loading && !loadError && (
        <div style={{ borderTop: `1px solid ${line}`, paddingTop: '16px' }}>
          <button type="button" aria-expanded={asking} aria-controls={formId} onClick={() => { setAsking((v) => !v); setSentNote(null); }} style={buttonOutline}>
            {asking ? 'Close' : 'Ask a question'}
          </button>
          <div id={formId} hidden={!asking} style={{ marginTop: '16px' }}>
            {asking && (
              <AskForm
                productId={productId}
                onSent={(note) => {
                  setSentNote(note);
                  setAsking(false);
                }}
              />
            )}
          </div>
          {sentNote && <p role="status" style={{ ...bodyText, color: '#15803D', marginTop: '10px' }}>{sentNote}</p>}
        </div>
      )}
    </section>
  );
}

function AskForm({ productId, onSent }: { productId: string; onSent: (note: string) => void }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const length = text.trim().length;
  const canSubmit = !submitting && length >= QUESTION_MIN && length <= QUESTION_MAX;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const r = await askQuestion(productId, text);
    setSubmitting(false);
    if (r.ok) {
      setText('');
      onSent('Thanks. Your question will appear here once it has been checked.');
    } else {
      setError(r.error ?? 'We could not send your question. Try again.');
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label htmlFor={`${ids}-q`} style={{ ...smallText, color: ink, fontWeight: 600 }}>Your question</label>
      <textarea
        id={`${ids}-q`}
        value={text}
        rows={3}
        maxLength={QUESTION_MAX}
        onChange={(e) => setText(e.target.value)}
        aria-describedby={`${ids}-count`}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <span id={`${ids}-count`} style={{ ...smallText, textAlign: 'right' }}>
        {text.length}/{QUESTION_MAX}. At least {QUESTION_MIN} characters. Links and contact details are not allowed.
      </span>
      <button type="submit" disabled={!canSubmit} style={{ ...buttonPrimary, alignSelf: 'flex-start', opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
        {submitting ? 'Sending...' : 'Send question'}
      </button>
      <div role="alert" aria-live="assertive">
        {error && <p style={{ ...bodyText, color: '#B91C1C' }}>{error}</p>}
      </div>
    </form>
  );
}
