import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser } from '../../core/services/authService';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
import { AuthShell } from './components/AuthShell';

// Same values and storage key as Edit profile, so the choices made here show up there.
const DEMOGRAPHICS_KEY = 'glowvai:profile-demographics';
const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45+'];
const GENDERS = ['Female', 'Male', 'Non-binary', 'Other'];

// Only the choices made here are written; anything left blank keeps its saved value.
const saveDemographics = async (choices: { gender: string | null; ageGroup: string | null }) => {
  const patch = Object.fromEntries(Object.entries(choices).filter(([, value]) => value !== null));
  if (Object.keys(patch).length === 0) return;
  try {
    const raw = await storage.getItem(DEMOGRAPHICS_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await storage.setItem(DEMOGRAPHICS_KEY, JSON.stringify({ skinType: null, ...saved, ...patch }));
  } catch {
    // a corrupt or unavailable store should not block setup
  }
};

export const ProfileSetupScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const currentUser = getCurrentUser();

  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = fullName.trim().length >= 2;

  const handleContinue = async () => {
    if (!isFormValid || isLoading) return;

    safeHapticImpact();
    setIsLoading(true);
    await saveDemographics({ gender, ageGroup });
    try {
      await syncUserOnboardingData({ name: fullName.trim() });
    } catch {
      // continue even if sync fails, as in the mobile app
    } finally {
      setIsLoading(false);
    }
    navigate('auth-skin-survey');
  };

  const chipGroup = (options: string[], value: string | null, onSelect: (next: string | null) => void, suffix = '') => (
    <div className="auth-chips">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`auth-chip${value === option ? ' is-selected' : ''}`}
          aria-pressed={value === option}
          onClick={() => {
            safeHapticImpact();
            onSelect(value === option ? null : option);
          }}
        >
          {option}{suffix}
        </button>
      ))}
    </div>
  );

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={handleContinue} disabled={!isFormValid || isLoading}>
          {isLoading ? <span className="auth-spinner" aria-label="Saving" /> : <>Continue <ArrowRight aria-hidden="true" /></>}
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '50%' }} /></div>
        <span className="auth-step-label">Step 1 of 2 · About you</span>
      </div>

      <h1 className="auth-title">Set up your profile</h1>
      <p className="auth-subtitle">Tell us your name. Age and gender are optional and you can change them later in Edit profile.</p>

      <div className="auth-form-group">
        <label className="auth-label" htmlFor="auth-profile-name">Full name</label>
        <div className="auth-field auth-field-plain">
          <input
            id="auth-profile-name"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
      </div>

      <div className="auth-form-group">
        <span className="auth-label" id="auth-profile-age">Age group <em>Optional</em></span>
        <div role="group" aria-labelledby="auth-profile-age">
          {chipGroup(AGE_GROUPS, ageGroup, setAgeGroup, ' yrs')}
        </div>
      </div>

      <div className="auth-form-group">
        <span className="auth-label" id="auth-profile-gender">Gender <em>Optional</em></span>
        <div role="group" aria-labelledby="auth-profile-gender">
          {chipGroup(GENDERS, gender, setGender)}
        </div>
      </div>
    </AuthShell>
  );
};

export default ProfileSetupScreen;
