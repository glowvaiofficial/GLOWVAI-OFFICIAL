import { useEffect, useState } from 'react';
import { Info, Mail, Phone, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { storage } from '../../core/utils/storage';
import { useCustomerStore } from '../../core/state/customerStore';
import { useT } from '../../core/i18n/store';
import { validateProfileInput } from '@/lib/shop/settings/rules';
import { SettingsSwitch, useDateLabel } from '../settings/SettingsParts';
import { getInitials, ProfileHeader } from './ProfileShared';

const DEMOGRAPHICS_KEY = 'glowvai:profile-demographics';
const GENDERS = ['Female', 'Male', 'Non-binary', 'Other'];
const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45+'];
const SKIN_TYPES = ['Combination Skin', 'Dry Skin', 'Oily Skin', 'Sensitive'];

interface Demographics {
  gender: string | null;
  ageGroup: string | null;
  skinType: string | null;
}

// Edit profile: name, mobile number (required, not verified), optional email, and the two consent choices with their
// dates. Saved to users/{uid} through POST /api/shop/profile. The address is left alone, so it is kept on the account.
export const EditProfileScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const dateLabel = useDateLabel();
  const { goBack } = useApp();
  const profile = useCustomerStore((s) => s.profile);
  const saveProfile = useCustomerStore((s) => s.saveProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [marketing, setMarketing] = useState(profile?.marketingOptIn === true);
  const [analytics, setAnalytics] = useState(profile?.analyticsOptIn === true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [demographics, setDemographics] = useState<Demographics>({ gender: null, ageGroup: null, skinType: null });

  // The saved details can arrive from the server after the screen opened. Filled only while the field is still empty.
  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.name);
    setEmail((v) => v || profile.email);
    setPhone((v) => v || profile.phone);
    setMarketing(profile.marketingOptIn === true);
    setAnalytics(profile.analyticsOptIn === true);
  }, [profile]);

  useEffect(() => {
    storage.getItem(DEMOGRAPHICS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<Demographics>;
        setDemographics({ gender: saved.gender ?? null, ageGroup: saved.ageGroup ?? null, skinType: saved.skinType ?? null });
      } catch {
        // ignore corrupt saved values
      }
    });
  }, []);

  const updateDemographics = (patch: Partial<Demographics>) => {
    const next = { ...demographics, ...patch };
    setDemographics(next);
    storage.setItem(DEMOGRAPHICS_KEY, JSON.stringify(next));
  };

  const handleSave = async () => {
    setSaved(false);
    setError(null);
    // The same rules the server applies, so the customer sees the problem before the request is sent.
    const checked = validateProfileInput({ name, phone, email, marketingOptIn: marketing, analyticsOptIn: analytics });
    if (!checked.ok) {
      setFieldErrors({ [checked.field]: checked.error });
      setError(t('profile.invalid'));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const result = await saveProfile({
      name: checked.value.name,
      phone: checked.value.phone,
      email: checked.value.email,
      marketingOptIn: marketing,
      analyticsOptIn: analytics,
    });
    setSaving(false);
    if (!result.ok) {
      // The server's message is shown as text.
      setError(result.error || t('common.error'));
      return;
    }
    setSaved(true);
  };

  const chipGroup = (
    options: string[],
    selected: string | null,
    onSelect: (value: string) => void,
    format: (value: string) => string = (value) => value,
  ) => (
    <div className="profile-chip-row">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={selected === option ? 'profile-chip is-active' : 'profile-chip'}
          aria-pressed={selected === option}
          onClick={() => onSelect(option)}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );

  const choiceNote = (at: number | null | undefined) => (at ? t('profile.choiceDate', { date: dateLabel(at) }) : t('profile.choiceNone'));

  return (
    <main className="profile-screen">
      {!embedded && <ProfileHeader title={t('profile.title')} onBack={goBack} />}

      <div className="profile-body">
        <div className="profile-side">
          <section className="profile-card profile-identity">
            <span className="profile-hero-avatar profile-hero-avatar-lg">{getInitials(name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name.trim() || t('profile.name')}</span>
              <span className="profile-user-phone">{phone ? `+91 ${phone}` : t('profile.phone')}</span>
            </span>
          </section>

          <p className="profile-label">{t('profile.title')}</p>
          <section className="profile-card profile-card-body">
            <label className="profile-field">
              <span className="profile-field-head"><span className="profile-field-label">{t('profile.name')}</span></span>
              <span className="profile-input-wrap">
                <User size={18} aria-hidden="true" />
                <input
                  className="profile-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profile.name')}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'profile-name-error' : undefined}
                />
              </span>
              {fieldErrors.name && <span id="profile-name-error" className="settings-field-error">{fieldErrors.name}</span>}
            </label>

            <label className="profile-field">
              <span className="profile-field-head"><span className="profile-field-label">{t('profile.phone')}</span></span>
              <span className="profile-input-wrap">
                <Phone size={18} aria-hidden="true" />
                <input
                  className="profile-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoComplete="tel-national"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={`profile-phone-help${fieldErrors.phone ? ' profile-phone-error' : ''}`}
                />
              </span>
              <span id="profile-phone-help" className="profile-field-hint"><Info size={14} aria-hidden="true" /> {t('profile.phoneHelp')}</span>
              {fieldErrors.phone && <span id="profile-phone-error" className="settings-field-error">{fieldErrors.phone}</span>}
            </label>

            <label className="profile-field">
              <span className="profile-field-head"><span className="profile-field-label">{t('profile.email')}</span></span>
              <span className="profile-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  className="profile-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('profile.emailHelp')}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'profile-email-error' : undefined}
                />
              </span>
              {fieldErrors.email && <span id="profile-email-error" className="settings-field-error">{fieldErrors.email}</span>}
            </label>
          </section>

          <p className="profile-label">{t('profile.choices')}</p>
          <section className="profile-card profile-card-body">
            <SettingsSwitch
              label={t('profile.marketing')}
              help={`${t('profile.marketingHelp')} ${choiceNote(profile?.marketingAt)}`}
              checked={marketing}
              onChange={setMarketing}
            />
            <SettingsSwitch
              label={t('profile.analytics')}
              help={`${t('profile.analyticsHelp')} ${choiceNote(profile?.analyticsAt)}`}
              checked={analytics}
              onChange={setAnalytics}
            />
          </section>

          {error && <p className="profile-field-error settings-status is-error" role="alert">{error}</p>}
          {saved && !error && <p className="settings-status is-ok" role="status">{t('profile.saved')}</p>}

          <div className="profile-action-bar">
            <button type="button" className="profile-button is-primary is-block" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>

        <div className="profile-main">
          <p className="profile-label">Demographics (kept on this device)</p>
          <section className="profile-card profile-card-body">
            <div className="profile-field">
              <span className="profile-field-label">Gender</span>
              {chipGroup(GENDERS, demographics.gender, (gender) => updateDemographics({ gender }))}
            </div>
            <div className="profile-divider" />
            <div className="profile-field">
              <span className="profile-field-label">Age group</span>
              {chipGroup(AGE_GROUPS, demographics.ageGroup, (ageGroup) => updateDemographics({ ageGroup }), (value) => `${value} yrs`)}
            </div>
          </section>

          <p className="profile-label">Skin profile</p>
          <section className="profile-card profile-card-body">
            <div className="profile-field">
              <span className="profile-field-label">Primary skin type</span>
              {chipGroup(SKIN_TYPES, demographics.skinType, (skinType) => updateDemographics({ skinType }))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
