import { useEffect, useState } from 'react';
import { isActivityType } from '@/lib/shop/settings/rules';
import { fetchActivity, type ActivityEntry } from '../../core/services/shopApi';
import { useT } from '../../core/i18n/store';
import type { MessageKey } from '../../core/i18n/messages';
import { SettingsPage, useDateLabel } from './SettingsParts';

// The customer's own account activity. Each row shows the kind of change from the catalogue. The server's text is not
// shown: it is fixed copy, but the catalogue keeps every visible string in the customer's language.
export const ActivityScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const dateLabel = useDateLabel();
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (cursor: string | null) => {
    setError(null);
    setLoading(true);
    const res = await fetchActivity(cursor);
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? t('common.error'));
      return;
    }
    setItems((prev) => (cursor ? [...prev, ...res.data!.items] : res.data!.items));
    setNextCursor(res.data.nextCursor);
  };

  useEffect(() => {
    void load(null);
    // Loaded once when the screen opens; "Load more" pages on from here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelFor = (type: string): string => {
    const key: MessageKey = isActivityType(type) ? (`activity.type.${type}` as MessageKey) : 'activity.type.unknown';
    return t(key);
  };

  return (
    <SettingsPage title={t('activity.title')} embedded={embedded}>
      <div className="settings-card">
        <p className="settings-note">{t('activity.intro')}</p>
        {items.length === 0 && !loading && !error && <p className="settings-empty">{t('activity.empty')}</p>}
        <ol className="settings-activity-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((entry) => (
            <li key={entry.id} className="settings-activity-item">
              <span>{labelFor(entry.type)}</span>
              <span className="settings-activity-date">{dateLabel(entry.createdAt)}</span>
            </li>
          ))}
        </ol>
        {loading && <p className="settings-empty" role="status">{t('common.loading')}</p>}
        {error && (
          <div className="settings-stack">
            <p className="settings-status is-error" role="alert">{error}</p>
            <button type="button" className="profile-button is-outline" onClick={() => void load(nextCursor)}>{t('common.retry')}</button>
          </div>
        )}
        {!loading && nextCursor && (
          <button type="button" className="profile-button is-outline" onClick={() => void load(nextCursor)}>{t('common.loadMore')}</button>
        )}
      </div>
    </SettingsPage>
  );
};
