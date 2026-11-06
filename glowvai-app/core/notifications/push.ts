// Web push for order updates (Firebase Cloud Messaging). Nothing here asks for permission on its own: enableOrderUpdates
// is called only from the "Turn on order updates" button. The rest is quiet: it reads the permission the customer
// already gave, keeps the device's token current, and listens for messages while the shop is open.
//
// The owner sets NEXT_PUBLIC_FIREBASE_VAPID_KEY (Firebase console: Project settings, Cloud Messaging, Web Push
// certificates) and NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID. Until both are set the feature reports 'not-configured'
// and does nothing.
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from '../config/firebase';
import { registerPushToken } from '../services/shopApi';

export const VAPID_KEY: string = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
export const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';
// The device token is registered again at most once a day, or when the browser issues a new one.
const REFRESH_MS = 24 * 60 * 60 * 1000;
const STORED_TOKEN_KEY = 'glowvai.push.token';
const STORED_AT_KEY = 'glowvai.push.registeredAt';

export type PushState = 'not-configured' | 'unsupported' | 'denied' | 'default' | 'granted';

export type EnableResult =
  | { status: 'enabled' }
  | { status: 'not-configured' }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'dismissed' }
  | { status: 'error'; message: string };

export const NOT_SET_UP_MESSAGE = 'Notifications are not set up yet. Order updates still show in your list.';

// Public Firebase settings the service worker needs. They are not secret: the browser bundle already contains them.
export function serviceWorkerQuery(): string {
  const options = app.options;
  const params = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ['apiKey', options.apiKey],
    ['authDomain', options.authDomain],
    ['projectId', options.projectId],
    ['appId', options.appId],
    ['messagingSenderId', options.messagingSenderId],
  ];
  for (const [key, value] of entries) if (value) params.set(key, value);
  return params.toString();
}

const senderConfigured = (): boolean => Boolean(app.options.messagingSenderId);

export const pushConfigured = (): boolean => VAPID_KEY.length > 0 && senderConfigured();

export async function pushSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function currentPushState(): Promise<PushState> {
  if (!pushConfigured()) return 'not-configured';
  if (!(await pushSupported())) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.permission === 'denied' ? 'denied' : 'default';
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(`${SERVICE_WORKER_PATH}?${serviceWorkerQuery()}`, { scope: '/' });
}

// Gets this browser's token and registers it with the shop. Requires permission to be granted already.
async function issueToken(): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  try {
    const reg = await registration();
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, message: 'We could not turn on updates in this browser. Try again later.' };
    return { ok: true, token };
  } catch {
    return { ok: false, message: 'We could not turn on updates in this browser. Try again later.' };
  }
}

function rememberToken(token: string): void {
  try {
    localStorage.setItem(STORED_TOKEN_KEY, token);
    localStorage.setItem(STORED_AT_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked. The token is then registered again next time, which the server accepts.
  }
}

function recentlyRegistered(token: string): boolean {
  try {
    const stored = localStorage.getItem(STORED_TOKEN_KEY);
    const at = Number(localStorage.getItem(STORED_AT_KEY));
    return stored === token && Date.now() - at < REFRESH_MS;
  } catch {
    return false;
  }
}

// Called from the button only. Asks the browser for permission, then registers the device.
export async function enableOrderUpdates(): Promise<EnableResult> {
  if (!pushConfigured()) return { status: 'not-configured' };
  if (!(await pushSupported())) return { status: 'unsupported' };
  if (Notification.permission === 'denied') return { status: 'denied' };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission === 'denied') return { status: 'denied' };
  if (permission !== 'granted') return { status: 'dismissed' };

  const issued = await issueToken();
  if (!issued.ok) return { status: 'error', message: issued.message };
  const saved = await registerPushToken(issued.token);
  if (!saved.ok) return { status: 'error', message: saved.error ?? 'We could not turn on updates. Try again later.' };
  rememberToken(issued.token);
  return { status: 'enabled' };
}

// Runs at start-up for a customer who already allowed notifications. Never prompts. Registers again only when the
// token has changed or the last registration is a day old.
export async function keepTokenCurrent(): Promise<void> {
  if (!pushConfigured() || !(await pushSupported()) || Notification.permission !== 'granted') return;
  const issued = await issueToken();
  if (!issued.ok || recentlyRegistered(issued.token)) return;
  const saved = await registerPushToken(issued.token);
  if (saved.ok) rememberToken(issued.token);
}

// Calls onData for each message that arrives while the shop is open. Returns a function that stops listening.
export function listenForPush(onData: (data: Record<string, string>) => void): () => void {
  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  void (async () => {
    if (!pushConfigured() || !(await pushSupported()) || Notification.permission !== 'granted') return;
    try {
      const off = onMessage(getMessaging(app), (payload) => {
        if (!stopped) onData((payload.data ?? {}) as Record<string, string>);
      });
      if (stopped) off();
      else unsubscribe = off;
    } catch {
      // Messaging unavailable in this browser: nothing to listen to.
    }
  })();
  return () => {
    stopped = true;
    unsubscribe?.();
  };
}
