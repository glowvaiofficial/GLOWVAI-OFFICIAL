// Typed calls to the privacy, devices, payment method and gift card routes (app/api/shop/*). Each call goes through
// apiFetch, which adds the customer's ID token and the device id header.
import { apiFetch, getIdToken, type ApiResult } from '../../core/services/customerSession';

export interface PrivacySummary {
  profile: { name: string; phone: string; email: string; hasAddress: boolean };
  counts: { addresses: number; orders: number; reviews: number; wishlist: number; subscriptions: number; supportTickets: number; devices: number };
  consents: { marketing: boolean; analytics: boolean };
}

export interface ConsentState {
  marketing: boolean;
  analytics: boolean;
  marketingUpdatedAt: number | null;
  analyticsUpdatedAt: number | null;
}

export type DeletionStatus = 'REQUESTED' | 'CANCELLED' | 'PROCESSING' | 'COMPLETED';
export interface DeletionView {
  id: string;
  status: DeletionStatus;
  requestedAt: number;
  cancelledAt: number | null;
}
export interface DeletionTiming {
  acknowledgeWithin: string;
  resolveWithin: string;
}

export interface DeviceView {
  id: string;
  name: string;
  firstSeenAt: number;
  lastSeenAt: number;
  current: boolean;
}

export interface SavedMethod {
  id: string;
  kind: 'card' | 'upi';
  label: string;
  preferred: boolean;
}

export interface GiftCardView {
  cardId: string;
  role: 'bought' | 'redeemed';
  status: 'ACTIVE' | 'REDEEMED';
  amountRupees: number;
  coins: number;
  recipientName: string;
  message: string;
  lastFour: string;
  createdAt: number;
}

export const GIFT_LIMITS = { min: 200, max: 10000 } as const;

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const fetchSummary = () => apiFetch<{ summary: PrivacySummary }>('/api/shop/privacy/summary');
export const fetchConsents = () => apiFetch<{ consents: ConsentState }>('/api/shop/privacy/consent');
export const saveConsents = (changes: { marketing?: boolean; analytics?: boolean }) =>
  apiFetch<{ consents: ConsentState }>('/api/shop/privacy/consent', json(changes));
export const fetchDeletion = () => apiFetch<{ request: DeletionView | null; timing: DeletionTiming }>('/api/shop/privacy/deletion');
export const changeDeletion = (action: 'request' | 'cancel') =>
  apiFetch<{ request: DeletionView | null; timing: DeletionTiming }>('/api/shop/privacy/deletion', json({ action }));

export const fetchDevices = () =>
  apiFetch<{ devices: DeviceView[]; max: number; lastSignInAt: number | null; guest: boolean }>('/api/shop/devices');
export const removeDevice = (id: string) => apiFetch<{ wasThisDevice: boolean }>(`/api/shop/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const signOutOtherDevices = () => apiFetch<{ removed: number; sessionEnded: boolean }>('/api/shop/devices/sign-out-others', json({}));

export const fetchPaymentMethods = () =>
  apiFetch<{ enabled: boolean; message?: string; methods: SavedMethod[]; max: number; preferredTokenId?: string | null }>('/api/shop/payment-methods');
export const startSavingCard = () =>
  apiFetch<{ keyId: string; orderId: string; customerId: string; amountPaise: number; currency: string; checkout: { customer_id: string; save: number } }>(
    '/api/shop/payment-methods',
    json({}),
  );
export const confirmSavedCard = (paymentId: string) => apiFetch<unknown>('/api/shop/payment-methods/confirm', json({ paymentId }));
export const removeSavedMethod = (tokenId: string) => apiFetch<unknown>(`/api/shop/payment-methods/${encodeURIComponent(tokenId)}`, { method: 'DELETE' });
export const setPreferredMethod = (tokenId: string | null) =>
  apiFetch<{ preferredTokenId: string | null }>('/api/shop/payment-methods/preferred', json({ tokenId }));

export const fetchGiftCards = () =>
  apiFetch<{ enabled: boolean; cards: GiftCardView[]; amount: { min: number; max: number } }>('/api/shop/gift-cards');
export const startGiftPurchase = (input: { amount: number; recipientName: string; message: string }) =>
  apiFetch<{ purchaseId: string; razorpayOrderId: string; amountPaise: number; currency: string; keyId: string }>('/api/shop/gift-cards/purchase', json(input));
export const verifyGiftPurchase = (input: {
  purchaseId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => apiFetch<{ alreadyIssued: boolean; cardId: string; code?: string; lastFour?: string }>('/api/shop/gift-cards/purchase/verify', json(input));
export const redeemGiftCard = (code: string) => apiFetch<{ coins: number; alreadyRedeemed: boolean }>('/api/shop/gift-cards/redeem', json({ code }));

// Downloads the account export. The server returns the JSON file directly; this saves it in the browser.
export async function downloadMyData(): Promise<{ ok: true } | { ok: false; error: string }> {
  let token: string;
  try {
    token = await getIdToken();
  } catch {
    return { ok: false, error: 'We could not start your session. Please try again.' };
  }
  const res = await fetch('/api/shop/privacy/export', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error || 'Your data could not be downloaded. Try again.' };
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glowvai-my-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true };
}

export type { ApiResult };
