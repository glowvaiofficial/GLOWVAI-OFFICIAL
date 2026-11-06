// What is on screen: up to two top toasts (the rest wait in a backlog) and a queue of centred dialogs (one at a time).
import { create } from 'zustand';
import type { OrderMessageCopy } from './orderEvents';

export const MAX_VISIBLE_TOASTS = 2;

export interface NotificationMessage extends OrderMessageCopy {
  id: string;
}

interface NotificationState {
  toasts: NotificationMessage[];
  toastBacklog: NotificationMessage[];
  modals: NotificationMessage[];
  push: (messages: NotificationMessage[]) => void;
  dismissToast: (id: string) => void;
  dismissModal: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  toasts: [],
  toastBacklog: [],
  modals: [],

  push: (messages) =>
    set((state) => {
      const toasts = [...state.toasts];
      const toastBacklog = [...state.toastBacklog];
      const modals = [...state.modals];
      for (const message of messages) {
        if (message.variant === 'modal') modals.push(message);
        else if (toasts.length < MAX_VISIBLE_TOASTS) toasts.push(message);
        else toastBacklog.push(message);
      }
      return { toasts, toastBacklog, modals };
    }),

  dismissToast: (id) =>
    set((state) => {
      if (!state.toasts.some((t) => t.id === id)) return state;
      const remaining = state.toasts.filter((t) => t.id !== id);
      const [next, ...rest] = state.toastBacklog;
      return {
        toasts: next ? [...remaining, next] : remaining,
        toastBacklog: rest,
      };
    }),

  dismissModal: (id) => set((state) => ({ modals: state.modals.filter((m) => m.id !== id) })),
}));
