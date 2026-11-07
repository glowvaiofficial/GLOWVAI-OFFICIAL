import { useEffect, useState } from 'react';
import { fetchNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from '../../core/services/shopApi';
import { useT } from '../../core/i18n/store';
import type { MessageKey } from '../../core/i18n/messages';
import { SettingsPage, SettingsSwitch } from './SettingsParts';

// One switch per notification type. Each entry says what the type covers, in the catalogue.
const TOGGLES: { key: keyof NotificationPrefs; label: MessageKey; help: MessageKey }[] = [
  { key: 'orders', label: 'notifications.orders', help: 'notifications.ordersHelp' },
  { key: 'offers', label: 'notifications.offers', help: 'notifications.offersHelp' },
  { key: 'reviews', label: 'notifications.reviews', help: 'notifications.reviewsHelp' },
  { key: 'returns', label: 'notifications.returns', help: 'notifications.returnsHelp' },
  { key: 'referrals', label: 'notifications.referrals', help: 'notifications.referralsHelp' },
  { key: 'subscriptions', label: 'notifications.subscriptions', help: 'notifications.subscriptionsHelp' },
];

// Notification choices. Offers can only be on when the customer has agreed to marketing messages, as the server requires.
export const NotificationSettings = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoadError(null);
    const res = await fetchNotificationPrefs();
    if (res.ok && res.data) {
      setPrefs(res.data.prefs);
      setMarketingConsent(res.data.marketingConsent === true);
    } else {
      setLoadError(res.error ?? t('common.error'));
    }
  };

  useEffect(() => {
    void load();
    // Loaded once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSaveError(null);
    setSaved(false);
    const res = await saveNotificationPrefs({ [key]: value });
    if (res.ok && res.data) {
      setPrefs(res.data.prefs);
      setSaved(true);
    } else {
      // Put the switch back to what the server holds, and show why.
      setPrefs(before);
      setSaveError(res.error ?? t('common.error'));
    }
  };

  return (
    <SettingsPage title={t('notifications.title')} embedded={embedded}>
      <div className="settings-card">
        <p className="settings-note">{t('notifications.intro')}</p>
        {loadError && (
          <div className="settings-stack">
            <p className="settings-status is-error" role="alert">{loadError}</p>
            <button type="button" className="profile-button is-outline" onClick={() => void load()}>{t('common.retry')}</button>
          </div>
        )}
        {!loadError && !prefs && <p className="settings-empty" role="status">{t('common.loading')}</p>}
        {prefs && TOGGLES.map((item) => {
          const offersLocked = item.key === 'offers' && !marketingConsent;
          return (
            <SettingsSwitch
              key={item.key}
              label={t(item.label)}
              help={t(item.help)}
              checked={prefs[item.key]}
              disabled={offersLocked}
              footnote={offersLocked ? t('notifications.offersNeedConsent') : undefined}
              onChange={(next) => void change(item.key, next)}
            />
          );
        })}
        {prefs && <p className="settings-note">{t('notifications.quietHours')}</p>}
        {saveError && <p className="settings-status is-error" role="alert">{saveError}</p>}
        {saved && !saveError && <p className="settings-status is-ok" role="status">{t('notifications.saved')}</p>}
      </div>
    </SettingsPage>
  );
};
