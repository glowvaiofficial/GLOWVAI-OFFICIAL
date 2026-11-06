// Calls to the review and question routes. Public reads need no sign-in, so they use plain fetch and do not create a
// session. Anything that writes, or that is about the signed-in customer, goes through apiFetch with the customer's token.
import { apiFetch, type ApiResult } from '../../core/services/customerSession';

export type ReviewSort = 'newest' | 'highest' | 'lowest';

export interface PublicReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  verifiedPurchase: true;
  createdAt: string;
  updatedAt: string;
}

// Only what the server computed. average is null until a review is approved.
export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface ReviewPage {
  rating: RatingSummary;
  reviews: PublicReview[];
  nextCursor: string | null;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OwnReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  status: ReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  editDeadline: string;
}

export interface OwnReviewState {
  review: OwnReview | null;
  canWrite: boolean;
  reason: string | null;
}

export interface PublicQuestion {
  id: string;
  text: string;
  askedBy: string;
  createdAt: string;
  answer: { text: string; answeredAt: string; by: 'GlowVai team' } | null;
}

export interface QuestionPage {
  questions: PublicQuestion[];
  nextCursor: string | null;
}

const NETWORK_ERROR = 'We could not reach GlowVai. Check your connection and try again.';

async function publicGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    const body = (await response.json().catch(() => null)) as (T & { ok?: boolean; error?: string }) | null;
    const ok = response.ok && body?.ok !== false;
    return {
      ok,
      status: response.status,
      data: (body as T | null) ?? null,
      error: ok ? null : body?.error || NETWORK_ERROR,
    };
  } catch {
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR };
  }
}

const post = (body: unknown, method: 'POST' | 'PATCH' = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

export function fetchReviews(productId: string, sort: ReviewSort, cursor?: string | null): Promise<ApiResult<ReviewPage>> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set('cursor', cursor);
  return publicGet<ReviewPage>(`/api/shop/products/${encodeURIComponent(productId)}/reviews?${params.toString()}`);
}

export function fetchQuestions(productId: string, cursor?: string | null): Promise<ApiResult<QuestionPage>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return publicGet<QuestionPage>(`/api/shop/products/${encodeURIComponent(productId)}/questions${query ? `?${query}` : ''}`);
}

// The signed-in customer's review of this product, and whether they may write one (the server decides).
export function fetchOwnReview(productId: string): Promise<ApiResult<OwnReviewState>> {
  return apiFetch<OwnReviewState>(`/api/shop/reviews?productId=${encodeURIComponent(productId)}`);
}

export interface ReviewDraft {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

// Posts a new review, or edits the customer's existing one (PATCH). The server validates everything again.
export function saveReview(draft: ReviewDraft, editing: boolean): Promise<ApiResult<{ status: ReviewStatus; message: string }>> {
  return apiFetch<{ status: ReviewStatus; message: string }>('/api/shop/reviews', post(draft, editing ? 'PATCH' : 'POST'));
}

export function askQuestion(productId: string, text: string): Promise<ApiResult<{ questionId: string; status: string }>> {
  return apiFetch<{ questionId: string; status: string }>(`/api/shop/products/${encodeURIComponent(productId)}/questions`, post({ text }));
}
