import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../core/config/firebase';
import { useApp } from '../../context/useApp';
import { useCustomerStore } from '../../core/state/customerStore';
import { useT } from '../../core/i18n/store';
import { SettingsRow } from './SettingsParts';
import { settingsSections, type SettingsSection } from './settingsSections';
import './settings.css';

const WIDE_QUERY = '(min-width: 900px)';

// True on large screens, where the section list and the chosen section sit side by side.
function useWideLayout(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return wide;
}

// The Settings hub. Phones: a single list, each row opens its own page. Large screens: the list on the left and the
// chosen section on the right. The sign-out row asks first.
export const SettingsHubScreen = () => {
  const t = useT();
  const { navigate, goBack } = useApp();
  const wide = useWideLayout();
  const [selectedId, setSelectedId] = useState<SettingsSection['id']>('profile');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const selected = settingsSections.find((s) => s.id === selectedId) ?? settingsSections[0];

  const activate = (section: SettingsSection) => {
    if (section.id === 'signOut') {
      setSignOutError(null);
      setConfirmOpen(true);
      return;
    }
    if (wide) {
      setSelectedId(section.id);
      return;
    }
    if (section.route) navigate(section.route);
  };

  const doSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut(auth);
      useCustomerStore.getState().reset();
      // A fresh page start gives this device a new session and reloads the account from the server.
      window.location.assign('/shop');
    } catch {
      setSigningOut(false);
      setSignOutError(t('common.error'));
    }
  };

  const Detail = selected.Panel;

  return (
    <div className="settings-page settings-hub">
      <header className="settings-header">
        <button type="button" className="settings-back" onClick={goBack} aria-label={t('common.back')}>
          <span aria-hidden="true">←</span>
        </button>
        <div className="settings-header-copy">
          <h1 className="settings-title">{t('settings.title')}</h1>
          <p className="settings-subtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav aria-label={t('settings.listLabel')} className="settings-list">
          {settingsSections.map((section) => (
            <SettingsRow
              key={section.id}
              icon={section.icon}
              title={t(section.titleKey)}
              description={t(section.descKey)}
              onClick={() => activate(section)}
              current={wide && section.id === selectedId}
              danger={section.id === 'signOut'}
            />
          ))}
        </nav>

        {wide && Detail && (
          <div className="settings-detail" aria-live="polite">
            <Detail />
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="settings-dialog-backdrop">
          <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-signout-title">
            <h2 id="settings-signout-title">{t('settings.signOutConfirmTitle')}</h2>
            <p className="settings-note">{t('settings.signOutConfirmBody')}</p>
            {signOutError && <p className="settings-status is-error" role="alert">{signOutError}</p>}
            <div className="settings-dialog-actions">
              <button type="button" className="profile-button is-danger is-block" onClick={() => void doSignOut()} disabled={signingOut}>
                {signingOut ? t('settings.signingOut') : t('settings.signOutConfirm')}
              </button>
              <button type="button" className="profile-button is-outline is-block" onClick={() => setConfirmOpen(false)} disabled={signingOut}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
