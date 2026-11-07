// Typed calls for order tracking, the invoice, substitution preference and returns or replacements. Built on the same
// customer session as shopApi.ts (Firebase ID token, never throws: the result carries the server's message).
import { apiFetch, getIdToken, type ApiResult } from './customerSession';

export type SubstitutionPreference = 'ALLOW_SUBSTITUTE' | 'NO_SUBSTITUTE' | 'CALL_ME';

export const SUBSTITUTION_OPTIONS: { id: SubstitutionPreference; label: string; hint: string }[] = [
  { id: 'ALLOW_SUBSTITUTE', label: 'Allow a similar substitute', hint: 'If an item is unavailable, we may send a similar product.' },
  { id: 'NO_SUBSTITUTE', label: 'Do not substitute', hint: 'If an item is unavailable, leave it out of my order.' },
  { id: 'CALL_ME', label: 'Call me before any change', hint: 'We will call you before we change anything in your order.' },
];

export type ReturnType = 'RETURN' | 'REPLACEMENT';

export type ReturnReason = 'DAMAGED' | 'WRONG_ITEM' | 'EXPIRED_OR_DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'NO_LONGER_NEEDED';

export const RETURN_REASON_OPTIONS: { id: ReturnReason; label: string; returnOnly?: boolean }[] = [
  { id: 'DAMAGED', label: 'Arrived damaged' },
  { id: 'WRONG_ITEM', label: 'Wrong item arrived' },
  { id: 'EXPIRED_OR_DEFECTIVE', label: 'Expired or defective' },
  { id: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { id: 'NO_LONGER_NEEDED', label: 'No longer needed', returnOnly: true },
];

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'REPLACEMENT_SHIPPED'
  | 'CLOSED';

export const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Request received',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  RECEIVED: 'Item received back',
  REFUNDED: 'Refund issued',
  REPLACEMENT_SHIPPED: 'Replacement on the way',
  CLOSED: 'Closed',
};

export interface TrackingTimelineEntry {
  at: number | null;
  label: string;
}

export interface TrackingReturn {
  returnId: string;
  type: ReturnType;
  status: ReturnStatus;
  requestedAt: number | null;
  items: { productId: string; title: string; quantity: number }[];
}

export interface OrderTracking {
  orderId: string;
  status: string;
  statusText: string;
  placedAt: number | null;
  deliveredAt: number | null;
  timeline: TrackingTimelineEntry[];
  expectedWindow: { from: number; to: number } | null;
  address: { recipientName: string; fullAddress: string; city: string; pincode: string; landmark: string } | null;
  rider: { name: string | null; phone: { display: string; tel: string | null } | null } | null;
  liveLocation: { available: false; note: string };
  substitutionPreference: { value: SubstitutionPreference | null; label: string | null; canChange: boolean; changeBlockedReason: string | null };
  returnWindowEndsAt: number | null;
  returns: TrackingReturn[];
}

export interface CustomerReturn {
  returnId: string;
  orderId: string;
  type: ReturnType;
  reason: ReturnReason;
  note: string;
  status: ReturnStatus;
  items: { productId: string; title: string; quantity: number; unitPrice: number }[];
  createdAt: number | null;
  updatedAt: number | null;
  timeline: { at: number | null; status: ReturnStatus }[];
}

const post = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

export const fetchOrderTracking = (orderId: string): Promise<ApiResult<{ tracking: OrderTracking }>> =>
  apiFetch<{ tracking: OrderTracking }>(`/api/shop/orders/${encodeURIComponent(orderId)}`);

export const setSubstitutionPreference = (orderId: string, substitutionPreference: SubstitutionPreference): Promise<ApiResult<unknown>> =>
  apiFetch(`/api/shop/orders/${encodeURIComponent(orderId)}/preferences`, post({ substitutionPreference }, 'PATCH'));

export const createReturnRequest = (input: {
  orderId: string;
  requestId: string;
  type: ReturnType;
  reason: ReturnReason;
  note: string;
  items: { productId: string; quantity: number }[];
}): Promise<ApiResult<{ created: boolean; return: CustomerReturn }>> => apiFetch('/api/shop/returns', post(input));

// The invoice is HTML, so it is fetched with the token and opened as a page the customer can print or save as PDF.
// Returns an error message, or null when the page was opened.
export async function openInvoice(orderId: string): Promise<string | null> {
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  if (!win) return 'Your browser blocked the invoice. Allow pop-ups for GlowVai and try again.';
  try {
    const token = await getIdToken();
    const response = await fetch(`/api/shop/orders/${encodeURIComponent(orderId)}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      win.close();
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return body?.error || 'The invoice could not be opened. Try again in a moment.';
    }
    const html = await response.text();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    win.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  } catch {
    win.close();
    return 'We could not reach GlowVai. Check your connection and try again.';
  }
}

// Live tracking (stage, copy, banners, estimate, map points). Built by lib/shop/liveTracking.ts; the types come from the
// shared pure module so the screen and the server agree on the shape.
export type { LiveTracking, LiveStep, TrackingStage } from '../../../lib/shop/tracking';
import type { LiveTracking } from '../../../lib/shop/tracking';

export const fetchLiveTracking = (orderId: string): Promise<ApiResult<{ tracking: LiveTracking }>> =>
  apiFetch<{ tracking: LiveTracking }>(`/api/shop/orders/${encodeURIComponent(orderId)}/tracking`);

// The delivery code is returned only at stage 8. Anything else is {available: false} and no code.
export type DeliveryCodeState = { available: false } | { available: true; code: string; locked: boolean; lockedMinutes: number };

export const fetchDeliveryCode = (orderId: string): Promise<ApiResult<{ deliveryCode: DeliveryCodeState }>> =>
  apiFetch<{ deliveryCode: DeliveryCodeState }>(`/api/shop/orders/${encodeURIComponent(orderId)}/delivery-code`);
// --- Shareable tracking link ------------------------------------------------------------------------------------------
// The customer makes (or replaces, or revokes) a link for one of their orders. The link itself is built on the server.
export const createTrackingShare = (orderId: string): Promise<ApiResult<{ url: string; expiresAt: string }>> =>
  apiFetch<{ url: string; expiresAt: string }>(`/api/shop/orders/${encodeURIComponent(orderId)}/share`, post({}));

export const revokeTrackingShare = (orderId: string): Promise<ApiResult<unknown>> =>
  apiFetch(`/api/shop/orders/${encodeURIComponent(orderId)}/share`, { method: 'DELETE' });

export interface SharedTracking {
  orderId: string;
  storeName: string;
  status: string;
  statusText: string;
  cancelled: boolean;
  delivered: boolean;
  outForDelivery: boolean;
  expectedWindow: { from: number; to: number } | null;
  delayed: boolean;
  delayText: string | null;
  riderFirstName: string | null;
}

// The public view of a shared link. No sign-in: a visitor opens the link as it is. Never throws.
export async function fetchSharedTracking(orderId: string, token: string): Promise<ApiResult<{ tracking: SharedTracking }>> {
  const failure = 'This tracking link is no longer valid. Ask the customer for a new link.';
  try {
    const params = new URLSearchParams({ orderId, k: token });
    const response = await fetch(`/api/shop/shared-tracking?${params.toString()}`, { cache: 'no-store' });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; tracking?: SharedTracking; error?: string } | null;
    const ok = response.ok && body?.ok === true && Boolean(body.tracking);
    return { ok, status: response.status, data: ok ? { tracking: body!.tracking! } : null, error: ok ? null : body?.error || failure };
  } catch {
    return { ok: false, status: 0, data: null, error: 'We could not reach GlowVai. Check your connection and try again.' };
  }
}
