// The signed-in vendor for the whole tab. GET /api/vendor/me is loaded once and shared by every screen (a module cache,
// read through useSyncExternalStore). It is never polled: it loads when the account is known, and again only when a
// screen asks through refresh(), or after this tab itself changes the application.

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { vendorFetch } from "./api";
import { isVendorApiError, messageForError } from "./errors";
import { vendorAuth } from "./firebase";
import { clearAllDrafts } from "./drafts";
import type { AuthPhase } from "./routing";
import type { VendorAccount, VendorMe, VendorMeResponse } from "./types";

export interface VendorSession {
  authPhase: AuthPhase;
  user: User | null;
  me: VendorMe | null;
  account: VendorAccount | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  refresh: () => Promise<void>;
}

interface Store {
  authPhase: AuthPhase;
  user: User | null;
  cache: { uid: string; account: VendorAccount; me: VendorMe } | null;
  errorUid: string | null;
  error: string | null;
  errorCode: string | null;
  inflight: boolean;
}

const EMPTY: Store = { authPhase: "loading", user: null, cache: null, errorUid: null, error: null, errorCode: null, inflight: false };
let store: Store = EMPTY;
const listeners = new Set<() => void>();
let authListening = false;
let inflightPromise: Promise<void> | null = null;

function set(patch: Partial<Store>): void {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => store;
const getServerSnapshot = () => EMPTY;

/** Loads /me for the signed-in user. `force` ignores the cache. Concurrent calls share one request. */
function loadMe(force: boolean): Promise<void> {
  const user = store.user;
  if (!user) return Promise.resolve();
  if (!force && store.cache?.uid === user.uid) return Promise.resolve();
  if (inflightPromise) return inflightPromise;

  set({ inflight: true });
  inflightPromise = vendorFetch<VendorMeResponse>("/me")
    .then((res) => {
      set({ cache: { uid: user.uid, account: res.account, me: res.vendor }, errorUid: null, error: null, errorCode: null });
    })
    .catch((err: unknown) => {
      const code = isVendorApiError(err) ? err.code : "INTERNAL";
      // Keep the last good answer on screen; the error says the newest attempt failed.
      set({ errorUid: user.uid, error: messageForError(err), errorCode: code });
    })
    .finally(() => {
      inflightPromise = null;
      set({ inflight: false });
    });
  return inflightPromise;
}

function ensureAuthListener(): void {
  if (authListening || typeof window === "undefined") return;
  authListening = true;
  onAuthStateChanged(vendorAuth(), (user) => {
    const sameUser = user?.uid === store.user?.uid;
    if (!user) {
      set({ authPhase: "signed-out", user: null, cache: null, errorUid: null, error: null, errorCode: null });
      return;
    }
    set({ authPhase: "signed-in", user, ...(sameUser ? {} : { cache: null, errorUid: null, error: null, errorCode: null }) });
    void loadMe(false);
  });
}

/** Hook: the signed-in vendor, shared across screens. */
export function useVendorSession(): VendorSession {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureAuthListener();
  }, []);

  const uid = s.user?.uid ?? null;
  const cacheForUser = uid && s.cache?.uid === uid ? s.cache : null;
  const errorForUser = uid && s.errorUid === uid ? s.error : null;
  const errorCodeForUser = uid && s.errorUid === uid ? s.errorCode : null;

  return {
    authPhase: s.authPhase,
    user: s.user,
    me: cacheForUser?.me ?? null,
    account: cacheForUser?.account ?? null,
    loading: s.authPhase === "loading" || s.inflight,
    error: errorForUser,
    errorCode: errorCodeForUser,
    refresh: async () => {
      const user = store.user ?? vendorAuth().currentUser;
      if (!user) return;
      // A fresh token carries the latest email-verified flag, so the account in /me is current too.
      await user.getIdToken(true).catch(() => undefined);
      await loadMe(true);
    },
  };
}

/** Hook: the vendor's /me, as the screens use it. */
export function useVendorMe(): {
  me: VendorMe | null;
  account: { uid: string; email: string; emailVerified: boolean } | null;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
} {
  const s = useVendorSession();
  return { me: s.me, account: s.account, loading: s.loading, error: s.error, refresh: s.refresh };
}

/** After this tab writes the application, the new state is shown without another request. */
export function setVendorMe(me: VendorMe): void {
  const uid = store.user?.uid;
  if (!uid || !store.cache || store.cache.uid !== uid) return;
  set({ cache: { ...store.cache, me } });
}

/** Forgets the shared /me answer (sign-out, or a different account). */
export function clearVendorSession(): void {
  set({ cache: null, errorUid: null, error: null, errorCode: null });
}

/** Signs out, forgets the cached /me and removes this browser's onboarding drafts. */
export async function signOutVendor(): Promise<void> {
  clearAllDrafts();
  clearVendorSession();
  await signOut(vendorAuth());
}
