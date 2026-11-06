// The customer's in-app notifications (GET /api/shop/notifications): the unread count for the header badge and the
// list on the notifications page. Nothing is kept on the device; the server is the source of truth.
import { create } from 'zustand';
import { fetchNotifications, markNotificationsRead, type InAppNotification } from '../services/shopApi';

interface InboxState {
  unreadCount: number;
  items: InAppNotification[];
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadingMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

const LOAD_ERROR = 'We could not load your notifications. Try again in a moment.';

export const useInbox = create<InboxState>()((set, get) => ({
  unreadCount: 0,
  items: [],
  nextCursor: null,
  status: 'idle',
  loadingMore: false,
  error: null,

  // First page and unread count. Replaces the list, so it is also what the badge polls.
  refresh: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    const result = await fetchNotifications();
    if (!result.ok || !result.data) {
      set({ status: 'error', error: result.error ?? LOAD_ERROR });
      return;
    }
    set({
      status: 'ready',
      unreadCount: result.data.unreadCount,
      items: result.data.notifications,
      nextCursor: result.data.nextCursor,
    });
  },

  loadMore: async () => {
    const cursor = get().nextCursor;
    if (!cursor || get().loadingMore) return;
    set({ loadingMore: true });
    const result = await fetchNotifications(cursor);
    if (!result.ok || !result.data) {
      set({ loadingMore: false, error: result.error ?? LOAD_ERROR });
      return;
    }
    const seen = new Set(get().items.map((n) => n.id));
    const added = result.data.notifications.filter((n) => !seen.has(n.id));
    set({
      loadingMore: false,
      items: [...get().items, ...added],
      nextCursor: result.data.nextCursor,
      unreadCount: result.data.unreadCount,
    });
  },

  // Marks the given items read straight away, then asks the server. A failure reloads the list to put the truth back.
  markRead: async (ids) => {
    const now = Date.now();
    const targets = new Set(get().items.filter((n) => n.readAt === null && ids.includes(n.id)).map((n) => n.id));
    if (targets.size === 0) return;
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - targets.size),
      items: state.items.map((n) => (targets.has(n.id) ? { ...n, readAt: now } : n)),
    }));
    const result = await markNotificationsRead({ ids: [...targets] });
    if (!result.ok) await get().refresh();
    else if (result.data) set({ unreadCount: result.data.unreadCount });
  },

  markAllRead: async () => {
    const now = Date.now();
    if (get().unreadCount === 0) return;
    set((state) => ({ unreadCount: 0, items: state.items.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)) }));
    const result = await markNotificationsRead({ all: true });
    if (!result.ok) await get().refresh();
    else if (result.data) set({ unreadCount: result.data.unreadCount });
  },

  reset: () => set({ unreadCount: 0, items: [], nextCursor: null, status: 'idle', loadingMore: false, error: null }),
}));
