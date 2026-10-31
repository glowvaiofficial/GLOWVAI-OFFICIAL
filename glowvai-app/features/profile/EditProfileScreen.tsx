import { useEffect, useRef, useState } from 'react';
import { Camera, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { storage } from '../../core/utils/storage';
import { getInitials, ProfileHeader } from './ProfileShared';

const DEMOGRAPHICS_KEY = 'glowvai:profile-demographics';
const GENDERS = ['Female', 'Male', 'Non-binary', 'Other'];
const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45+'];
const SKIN_TYPES = ['Combination Skin', 'Dry Skin', 'Oily Skin', 'Sensitive'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Demographics {
  gender: string | null;
  ageGroup: string | null;
  skinType: string | null;
}

export const EditProfileScreen = () => {
  const { user, customerDetails, saveCustomerDetails, showToast, goBack, navigate } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(customerDetails?.fullName ?? user?.name ?? '');
  const [email, setEmail] = useState(customerDetails?.email ?? user?.email ?? '');
  const phone = customerDetails?.phoneNumber ?? user?.phoneNumber ?? '';
  const [demographics, setDemographics] = useState<Demographics>({ gender: null, ageGroup: null, skinType: null });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storage.getItem(DEMOGRAPHICS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<Demographics>;
        setDemographics({
          gender: saved.gender ?? null,
          ageGroup: saved.ageGroup ?? null,
          skinType: saved.skinType ?? null,
        });
      } catch {
        // ignore corrupt saved values
      }
    });
  }, []);

  // Free the preview URL when the avatar changes or the screen unmounts.
  useEffect(() => () => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  const updateDemographics = (patch: Partial<Demographics>) => {
    const next = { ...demographics, ...patch };
    setDemographics(next);
    storage.setItem(DEMOGRAPHICS_KEY, JSON.stringify(next));
  };

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setError('Enter your full name to save.');
      return;
    }
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    saveCustomerDetails({
      fullName: trimmedName,
      phoneNumber: phone,
      email: trimmedEmail,
      deliveryNote: customerDetails?.deliveryNote,
    });
    showToast('Profile updated');
    goBack();
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

  return (
    <main className="profile-screen">
      <ProfileHeader title="Edit profile" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-avatar-block">
          <button type="button" className="profile-avatar-button" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo">
            <span className="profile-hero-avatar profile-hero-avatar-lg">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(name)}
            </span>
            <span className="profile-avatar-camera"><Camera size={16} /></span>
          </button>
          <button type="button" className="profile-text-link" onClick={() => fileInputRef.current?.click()}>
            Change profile photo
          </button>
          <input
            ref={fileInputRef}
            className="profile-file-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              handleAvatarChange(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <p className="profile-label">Personal details</p>
        <section className="profile-card profile-card-body">
          <label className="profile-field">
            <span className="profile-field-head"><span className="profile-field-label">Full name</span></span>
            <span className="profile-input-wrap">
              <User size={18} />
              <input className="profile-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" autoComplete="name" />
            </span>
          </label>

          <label className="profile-field">
            <span className="profile-field-head"><span className="profile-field-label">Email address</span></span>
            <span className="profile-input-wrap">
              <Mail size={18} />
              <input className="profile-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" />
            </span>
          </label>

          <div className="profile-field">
            <div className="profile-field-head">
              <span className="profile-field-label">Phone number</span>
              <button type="button" className="profile-text-link" onClick={() => navigate('auth-change-phone')}>Change phone →</button>
            </div>
            <span className="profile-input-wrap">
              <Phone size={18} />
              <input className="profile-input" value={phone || 'Not added'} disabled readOnly />
              <span className="profile-pill is-success"><ShieldCheck size={12} />Verified</span>
            </span>
          </div>

          {error && <p className="profile-field-error" role="alert">{error}</p>}
        </section>

        <p className="profile-label">Demographics</p>
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

        <button type="button" className="profile-button is-primary is-block" onClick={handleSave}>
          Save profile changes
        </button>
      </div>
    </main>
  );
};
