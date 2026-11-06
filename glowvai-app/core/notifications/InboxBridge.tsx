'use client';

// Mounted once inside the app. It keeps the unread count fresh while a customer is signed in, keeps this device's push
// token current, and shows a toast for a push that arrives while the shop is open. It never asks for permission.
import React, { useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useInbox } from './inboxStore';
import { keepTokenCurrent, listenForPush } from './push';
import { useNotificationStore } from './notificationStore';

// Polls the list at most about once a minute, and only while the tab is visible and a customer session exists.
const POLL_INTERVAL_MS = 60_000;
const CHECK_INTERVAL_MS = 15_000;

export function startInboxWatcher(): () => void {
  let stopped = false;
  let uid: string | null = null;
  let timer: number | null = null;
  let lastFetchAt = 0;

  const fetchIfDue = () => {
    if (stopped || !uid) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (Date.now() - lastFetchAt < POLL_INTERVAL_MS) return;
    lastFetchAt = Date.now();
    void useInbox.getState().refresh();
  };

  const stopTimer = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') fetchIfDue();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Only reads the session that already exists. It never starts one, so a visitor who has not used the shop costs nothing.
  const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
    if (stopped) return;
    if (!user) {
      uid = null;
      stopTimer();
      useInbox.getState().reset();
      return;
    }
    uid = user.uid;
    if (timer === null) timer = window.setInterval(fetchIfDue, CHECK_INTERVAL_MS);
    fetchIfDue();
    void keepTokenCurrent();
  });

  return () => {
    stopped = true;
    uid = null;
    stopTimer();
    unsubscribeAuth();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

let pushCounter = 0;

export const InboxBridge: React.FC = () => {
  useEffect(() => startInboxWatcher(), []);

  useEffect(
    () =>
      listenForPush((data) => {
        pushCounter += 1;
        const orderId = data.relatedType === 'order' && data.relatedId ? data.relatedId : '';
        useNotificationStore.getState().push([
          {
            id: `push:${Date.now()}:${pushCounter}`,
            variant: 'toast',
            tone: 'info',
            title: data.title || 'GlowVai',
            body: data.body || '',
            orderId,
            amountText: null,
          },
        ]);
        void useInbox.getState().refresh();
      }),
    [],
  );

  return null;
};
