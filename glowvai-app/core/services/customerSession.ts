// The customer's session with the shop's own server routes (/api/shop/*).
//
// Every device gets a Firebase Auth session through anonymous sign-in, so its profile, orders and support requests
// stay together under one id (the Firebase uid) that the server reads from the ID token. The session is kept in the
// browser (local persistence), so it survives a reload. SMS sign-in is not connected yet: nothing here claims that a
// phone number has been verified.
import { browserLocalPersistence, setPersistence, signInAnonymously, type User } from 'firebase/auth';
import { auth } from '../config/firebase';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

let pending: Promise<User> | null = null;

// Signs in anonymously once per device and returns the signed-in user. Concurrent callers share one attempt.
export function ensureCustomerSession(): Promise<User> {
  if (auth?.currentUser) return Promise.resolve(auth.currentUser);
  if (!pending) {
    pending = (async () => {
      if (typeof auth?.authStateReady === 'function') await auth.authStateReady();
      if (auth.currentUser) return auth.currentUser;
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Storage can be blocked (private mode). The session then lasts for this tab only.
      }
      const credential = await signInAnonymously(auth);
      return credential.user;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export async function getIdToken(forceRefresh = false): Promise<string> {
  const user = await ensureCustomerSession();
  return user.getIdToken(forceRefresh);
}

export function currentCustomerId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

const NETWORK_ERROR = 'We could not reach GlowVai. Check your connection and try again.';

// Calls a shop server route with the customer's ID token. Never throws: the result carries the server's message.
export async function apiFetch<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let token: string;
  try {
    token = await getIdToken();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // Anonymous sign-in is switched off for the project: the owner enables it in the Firebase console.
    const error = code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation'
      ? 'Customer sign-in is being set up. Please try again later.'
      : code === 'auth/network-request-failed'
        ? 'Check your internet connection and try again.'
        : 'We could not start your session. Please try again.';
    return { ok: false, status: 0, data: null, error };
  }

  const send = async (bearer: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${bearer}`);
    if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(path, { ...init, headers, cache: 'no-store' });
  };

  let response: Response;
  try {
    response = await send(token);
    // An expired token is refreshed once.
    if (response.status === 401) response = await send(await getIdToken(true));
  } catch {
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR };
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const ok = response.ok && body?.ok !== false;
  const error = ok
    ? null
    : (typeof body?.error === 'string' && body.error) || (response.status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : NETWORK_ERROR);
  return { ok, status: response.status, data: (body as T | null) ?? null, error };
}
