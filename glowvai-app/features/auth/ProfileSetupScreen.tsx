import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser } from '../../core/services/authService';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
import { AuthShell } from './components/AuthShell';

const AGE_RANGES = ['Under 18', '18-24', '25-34', '35-44', '45+'];
const GENDERS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say'];

export const ProfileSetupScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const currentUser = getCurrentUser();

  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [selectedAge, setSelectedAge] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const avatarUrl = currentUser?.photoURL || null;
  const [isLoading, setIsLoading] = useState(false);

  // Age range and gender are optional; only the name is required.
  const isFormValid = fullName.trim().length >= 2;
  const initial = fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : '';

  const handleContinue = async () => {
    if (!isFormValid || isLoading) return;

    safeHapticImpact();
    setIsLoading(true);
    try {
      // Age range and gender are not part of the account sync yet, so they are kept on this device.
      await storage.setItem('glowvai_profile_answers', JSON.stringify({ ageRange: selectedAge, gender: selectedGender }));
      await syncUserOnboardingData({ name: fullName.trim() });
    } catch {
      // continue even if sync fails, as in the mobile app
    } finally {
      setIsLoading(false);
    }
    navigate('auth-skin-survey');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={handleContinue} disabled={!isFormValid || isLoading}>
          {isLoading ? <span className="auth-spinner" aria-label="Saving" /> : 'Continue to Skin Survey'}
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '50%' }} /></div>
        <span className="auth-step-label">Step 1 of 2: Profile setup</span>
      </div>

      <h1 className="auth-title">Set Up Your Profile</h1>
      <p className="auth-subtitle">Tell us a little about you so we can personalise your recommendations.</p>

      <div className="auth-avatar-section" aria-hidden="true">
        <span className="auth-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initial ? <span>{initial}</span> : <UserRound />}
        </span>
      </div>

      <label className="auth-label" htmlFor="auth-profile-name">Full Name</label>
      <div className="auth-field auth-field-plain">
        <input
          id="auth-profile-name"
          placeholder="e.g. Priya Sharma"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>

      <span className="auth-label auth-label-spaced">Age range (optional)</span>
      <div className="auth-chips">
        {AGE_RANGES.map((range) => (
          <button
            key={range}
            type="button"
            className={`auth-chip${selectedAge === range ? ' is-selected' : ''}`}
            aria-pressed={selectedAge === range}
            onClick={() => {
              safeHapticImpact();
              setSelectedAge((current) => (current === range ? '' : range));
            }}
          >
            {range}
          </button>
        ))}
      </div>

      <span className="auth-label">Gender (optional)</span>
      <div className="auth-chips">
        {GENDERS.map((gender) => (
          <button
            key={gender}
            type="button"
            className={`auth-chip${selectedGender === gender ? ' is-selected' : ''}`}
            aria-pressed={selectedGender === gender}
            onClick={() => {
              safeHapticImpact();
              setSelectedGender((current) => (current === gender ? '' : gender));
            }}
          >
            {gender}
          </button>
        ))}
      </div>
    </AuthShell>
  );
};
