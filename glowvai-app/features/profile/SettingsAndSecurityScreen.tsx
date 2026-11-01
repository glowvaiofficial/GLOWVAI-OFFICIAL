import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard, Eye, Globe, Lock, LogOut, MapPin, Smartphone, Sparkles, Sun, Trash2, Bell, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { storage } from '../../core/utils/storage';
import { getInitials, ProfileHeader, ProfileListItem, ProfileSwitch } from './ProfileShared';

const SETTINGS_STORAGE_KEY = 'glowvai_settings_prefs';
const LANGUAGES = ['English', 'Hindi', 'Telugu'];
const APPEARANCES = ['Light Mode', 'Dark Mode', 'System Default'];

interface PersistedSettings {
  biometricEnabled: boolean;
  appLockEnabled: boolean;
  notificationsEnabled: boolean;
  language: string;
  appearance: string;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  biometricEnabled: true,
  appLockEnabled: true,
  notificationsEnabled: true,
  language: 'English',
  appearance: 'Light Mode',
};

export const SettingsAndSecurityScreen = () => {
  const { user, customerDetails, logout, deleteAccount, navigate, goBack } = useApp();
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS);
  const [privacyExpanded, setPrivacyExpanded] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const name = customerDetails?.fullName || user?.name || 'Add your name';

  // Saved prefs load after mount; corrupt JSON keeps the defaults.
  useEffect(() => {
    storage.getItem(SETTINGS_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved: Partial<PersistedSettings> = JSON.parse(raw);
        setSettings((current) => ({ ...current, ...saved }));
      } catch {
        // ignore corrupt saved prefs
      }
    });
  }, []);

  const update = (patch: Partial<PersistedSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Settings & privacy" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card">
          <button type="button" className="profile-user-button" onClick={() => navigate('profile-edit')}>
            <span className="profile-hero-avatar">{getInitials(customerDetails?.fullName || user?.name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name}</span>
              {user && (
                <span className="profile-pill is-success"><ShieldCheck size={12} />Phone verified</span>
              )}
            </span>
          </button>
        </section>

        <p className="profile-label">Account settings</p>
        <section className="profile-card">
          <ProfileListItem icon={<User size={16} />} title="Edit profile" onClick={() => navigate('profile-edit')} />
          <ProfileListItem icon={<MapPin size={16} />} title="Saved addresses" onClick={() => navigate('address-list')} />
          <ProfileListItem icon={<CreditCard size={16} />} title="Payment methods" onClick={() => navigate('checkout-payment-method')} />
        </section>

        <p className="profile-label">Security</p>
        <section className="profile-card">
          <div className="profile-list-row">
            <span className="profile-list-icon"><Lock size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Biometric login</span></span>
            <ProfileSwitch label="Biometric login" checked={settings.biometricEnabled} onChange={(checked) => update({ biometricEnabled: checked })} />
          </div>
          <div className="profile-list-row">
            <span className="profile-list-icon"><Lock size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">App lock</span></span>
            <ProfileSwitch label="App lock" checked={settings.appLockEnabled} onChange={(checked) => update({ appLockEnabled: checked })} />
          </div>
          <ProfileListItem icon={<Smartphone size={16} />} title="Change phone number" note="A verification OTP is sent to the new number" onClick={() => navigate('auth-change-phone')} />
        </section>

        </div>

        <div className="profile-main">
        <p className="profile-label">Privacy</p>
        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => setPrivacyExpanded(!privacyExpanded)} aria-expanded={privacyExpanded}>
            <span className="profile-list-icon"><Eye size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">AI scan privacy</span></span>
            {privacyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {privacyExpanded && (
            <p className="profile-privacy-note">
              <ShieldCheck size={16} />
              Your face is used only to validate scan position and create cosmetic insights. Identity recognition is not used.
            </p>
          )}
          <ProfileListItem icon={<Sparkles size={16} />} title="Scan history" onClick={() => navigate('scan-report')} />
          <ProfileListItem icon={<Trash2 size={16} />} title="Delete account data" note="Removes scan history, addresses and profile data" danger onClick={() => setDeleteConfirmOpen(true)} />
        </section>

        <p className="profile-label">Preferences</p>
        <section className="profile-card">
          <div className="profile-list-row">
            <span className="profile-list-icon"><Bell size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Notifications</span></span>
            <ProfileSwitch label="Notifications" checked={settings.notificationsEnabled} onChange={(checked) => update({ notificationsEnabled: checked })} />
          </div>
          <div className="profile-list-row">
            <span className="profile-list-icon"><Globe size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Language</span></span>
            <select className="profile-list-select" aria-label="Language" value={settings.language} onChange={(e) => update({ language: e.target.value })}>
              {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </div>
          <div className="profile-list-row">
            <span className="profile-list-icon"><Sun size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Appearance</span></span>
            <select className="profile-list-select" aria-label="Appearance" value={settings.appearance} onChange={(e) => update({ appearance: e.target.value })}>
              {APPEARANCES.map((appearance) => <option key={appearance} value={appearance}>{appearance}</option>)}
            </select>
          </div>
        </section>

        <button type="button" className="profile-button is-outline is-block" onClick={logout}>
          <LogOut size={18} />
          Sign out
        </button>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-delete-title">
            <h2 id="profile-delete-title">Delete account data?</h2>
            <p>This permanently removes your AI scan history and profile data. This action cannot be undone.</p>
            <button type="button" className="profile-button is-outline is-block" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
            <button
              type="button"
              className="profile-button is-danger is-block"
              onClick={() => {
                setDeleteConfirmOpen(false);
                deleteAccount();
              }}
            >
              Delete permanently
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
