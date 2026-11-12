import { useApp } from '../../context/useApp';
import { useT } from '../../core/i18n/store';
import type { MessageKey } from '../../core/i18n/messages';
import type { PortedScreenName } from '../../core/routes/names';
import { SettingsPage } from './SettingsParts';

// The Settings hub rows that open another team's page. A row on a wide screen shows a button in the detail panel; on a
// phone the row opens the full page through the app router.
export const SettingsLinkPanel = ({ route, titleKey, label }: { route: PortedScreenName; titleKey: MessageKey; label: string }) => {
  const t = useT();
  const { navigate } = useApp();
  return (
    <SettingsPage title={t(titleKey)} embedded>
      <div className="settings-stack">
        <button type="button" className="profile-button is-primary" onClick={() => navigate(route)}>{label}</button>
      </div>
    </SettingsPage>
  );
};

// The Sell and Affiliate pages are web pages outside the app shell (/sell, /affiliate), so they open as a full page load.
export const SettingsWebPage = ({ href, titleKey, label }: { href: string; titleKey: MessageKey; label: string }) => {
  const t = useT();
  const { goBack } = useApp();
  return (
    <SettingsPage title={t(titleKey)} onBack={goBack}>
      <div className="settings-stack">
        <button type="button" className="profile-button is-primary" onClick={() => window.location.assign(href)}>{label}</button>
      </div>
    </SettingsPage>
  );
};
