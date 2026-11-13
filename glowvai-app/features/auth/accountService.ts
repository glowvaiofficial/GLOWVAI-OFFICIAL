// Makes sure the signed-in phone account has its record on the server (users/{uid}, read by the GlowVai admin panel).
// The route is idempotent, so a repeat is harmless; a per-device marker keeps the calls (and the per-user rate limit)
// to one per account per device. Concurrent callers share one request.
import { apiFetch } from '../../core/services/customerSession';

export const ACCOUNT_MARKER_KEY = 'glowvai_account_ready';

export type AccountResult = { ok: true } | { ok: false; error: string };

let inFlight: Promise<AccountResult> | null = null;

const markerFor = (): string | null => {
  try {
    return window.localStorage.getItem(ACCOUNT_MARKER_KEY);
  } catch {
    return null;
  }
};

const setMarker = (uid: string): void => {
  try {
    window.localStorage.setItem(ACCOUNT_MARKER_KEY, uid);
  } catch {
    // Storage blocked: the next sign-in on this device simply asks the server again.
  }
};

export function ensureAccountRecord(uid: string): Promise<AccountResult> {
  if (markerFor() === uid) return Promise.resolve({ ok: true });
  if (inFlight) return inFlight;
  inFlight = (async (): Promise<AccountResult> => {
    const res = await apiFetch<{ created: boolean }>('/api/shop/account/create', { method: 'POST' });
    if (res.ok) {
      setMarker(uid);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'We could not finish setting up your account. Try again.' };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
