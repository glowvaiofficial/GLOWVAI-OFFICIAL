import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, MessageSquare, Package, Star, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useInbox } from '../../core/notifications/inboxStore';
import { fetchNotificationPrefs, saveNotificationPrefs, type InAppNotification, type NotificationPrefs } from '../../core/services/shopApi';
import { PushPrompt } from './PushPrompt';

const formatWhen = (ms: number): string => {
  if (!ms) return '';
  return new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

type NotifGroup = 'Today' | 'Yesterday' | 'Earlier';
const GROUPS: NotifGroup[] = ['Today', 'Yesterday', 'Earlier'];

const groupOf = (ms: number): NotifGroup => {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  if (ms >= startToday.getTime()) return 'Today';
  if (ms >= startToday.getTime() - 86_400_000) return 'Yesterday';
  return 'Earlier';
};

const iconFor = (item: InAppNotification) => {
  if (item.relatedType === 'order') return <Package size={18} />;
  if (item.relatedType === 'review') return <Star size={18} />;
  if (item.relatedType === 'question') return <MessageSquare size={18} />;
  if (item.relatedType === 'account') return <User size={18} />;
  return <Bell size={18} />;
};

const NotificationRow: React.FC<{ item: InAppNotification; onOpen: (item: InAppNotification) => void }> = ({ item, onOpen }) => {
  const unread = item.readAt === null;
  const opens = item.relatedType === 'order' && Boolean(item.relatedId);
  return (
    <li>
      <button type="button" className={unread ? 'notif-item is-unread' : 'notif-item'} onClick={() => onOpen(item)}>
        <span className="notif-icon-tile" aria-hidden="true">{iconFor(item)}</span>
        <span className="notif-item-copy">
          <span className="notif-item-title">
            {item.title}
            {unread && <span className="notif-sr"> (unread)</span>}
          </span>
          <span className="notif-item-body">{item.body}</span>
          <span className="notif-item-time">{formatWhen(item.createdAt)}</span>
        </span>
        {unread && <span className="notif-dot" aria-hidden="true" />}
        {opens && <ChevronRight size={18} aria-hidden="true" />}
      </button>
    </li>
  );
};

const PrefSwitch: React.FC<{ label: string; note: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }> = ({ label, note, checked, disabled, onChange }) => (
  <div className="notif-pref">
    <span className="notif-pref-copy">
      <span className="notif-pref-label" id={`pref-${label}`}>{label}</span>
      <span className="notif-pref-note">{note}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`pref-${label}`}
      className={checked ? 'notif-switch is-on' : 'notif-switch'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="notif-switch-knob" aria-hidden="true" />
    </button>
  </div>
);

export const NotificationsScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const { items, unreadCount, nextCursor, status, loadingMore, error, refresh, loadMore, markRead, markAllRead } = useInbox();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    void fetchNotificationPrefs().then((result) => {
      if (result.ok && result.data) {
        setPrefs(result.data.prefs);
        setMarketingConsent(result.data.marketingConsent);
      }
    });
    // Loads once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    setPrefError(null);
    setPrefs({ ...prefs, [key]: value });
    const result = await saveNotificationPrefs({ [key]: value });
    if (result.ok && result.data) setPrefs(result.data.prefs);
    else {
      setPrefs(prefs);
      setPrefError(result.error ?? 'We could not save that choice. Try again.');
    }
  };

  const open = (item: InAppNotification) => {
    if (item.readAt === null) void markRead([item.id]);
    if (item.relatedType === 'order' && item.relatedId) navigate('orders-detail', { orderId: item.relatedId });
  };

  return (
    <main className="notif-screen">
      <header className="notif-header">
        <button type="button" className="notif-icon-button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="notif-header-copy">
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="notif-text-button" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        )}
      </header>

      <div className="notif-body">
        <PushPrompt />

        <section aria-labelledby="notif-list-title">
          <h2 id="notif-list-title" className="notif-section-title">Recent</h2>
          {status === 'loading' && items.length === 0 && (
            <div className="notif-skeleton" role="status" aria-label="Loading your notifications">
              {[0, 1, 2].map((n) => <span key={n} className="notif-skeleton-row" aria-hidden="true" />)}
            </div>
          )}
          {status === 'error' && (
            <div className="notif-empty">
              <p role="alert">{error ?? 'We could not load your notifications.'}</p>
              <button type="button" className="notif-primary" onClick={() => void refresh()}>Try again</button>
            </div>
          )}
          {status === 'ready' && items.length === 0 && (
            <div className="notif-empty">
              <Bell size={28} aria-hidden="true" />
              <p>No notifications yet. Order and account updates will appear here.</p>
            </div>
          )}
          {GROUPS.map((group) => {
            const rows = items.filter((item) => groupOf(item.createdAt) === group);
            if (rows.length === 0) return null;
            return (
              <div key={group} className="notif-group">
                <h3 className="notif-group-title">{group}</h3>
                <ul className="notif-list">
                  {rows.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={open} />
                  ))}
                </ul>
              </div>
            );
          })}
          {nextCursor && (
            <button type="button" className="notif-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Show older notifications'}
            </button>
          )}
          {status === 'ready' && error && <p className="notif-error" role="alert">{error}</p>}
        </section>

        {prefs && (
          <section className="notif-card" aria-labelledby="notif-prefs-title">
            <h2 id="notif-prefs-title">What we message you about</h2>
            <PrefSwitch label="Orders" note="Accepted, packed, out for delivery, delivered, cancelled, payments and refunds." checked={prefs.orders} onChange={(v) => void changePref('orders', v)} />
            <PrefSwitch label="Reviews and questions" note="When your review is published or a question is answered." checked={prefs.reviews} onChange={(v) => void changePref('reviews', v)} />
            <PrefSwitch
              label="Offers"
              note={marketingConsent ? 'Rewards, coins and offers.' : 'Needs marketing updates turned on in your profile first.'}
              checked={prefs.offers}
              disabled={!marketingConsent}
              onChange={(v) => void changePref('offers', v)}
            />
            <p className="notif-note">No pushes between 10 pm and 8 am. Everything still appears in this list.</p>
            {prefError && <p className="notif-error" role="alert">{prefError}</p>}
          </section>
        )}
      </div>
    </main>
  );
};
