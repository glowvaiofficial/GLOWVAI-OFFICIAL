import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser } from '../../core/services/authService';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

const AGE_RANGES = ['Under 18', '18-24', '25-34', '35-44', '45+'];
const GENDERS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say'];

export const ProfileSetupScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const currentUser = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [selectedAge, setSelectedAge] = useState('18-24');
  const [selectedGender, setSelectedGender] = useState('Female');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.photoURL || null);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = fullName.trim().length >= 2 && !!selectedAge && !!selectedGender;
  const initial = fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : 'P';

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  };

  const handleContinue = async () => {
    if (!isFormValid || isLoading) return;

    safeHapticImpact();
    setIsLoading(true);
    try {
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
          {isLoading ? <span className="auth-spinner" aria-label="Saving" /> : 'Continue to Skin Survey →'}
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '50%' }} /></div>
        <span className="auth-step-label">STEP 1 OF 2: PROFILE SETUP</span>
      </div>

      <h1 className="auth-title">Set Up Your Profile</h1>
      <p className="auth-subtitle">Personalize your identity for express deliveries &amp; diagnostic tracking.</p>

      <div className="auth-avatar-section">
        <button type="button" className="auth-avatar" onClick={() => fileInputRef.current?.click()} aria-label="Add profile photo">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initial}</span>}
          <span className="auth-avatar-badge" aria-hidden="true"><Camera /></span>
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          tabIndex={-1}
          onChange={handleAvatarChange}
        />
        <p className="auth-hint">Tap to add profile photo (optional)</p>
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

      <span className="auth-label">Age Range</span>
      <div className="auth-chips">
        {AGE_RANGES.map((range) => (
          <button
            key={range}
            type="button"
            className={`auth-chip${selectedAge === range ? ' is-selected' : ''}`}
            aria-pressed={selectedAge === range}
            onClick={() => {
              safeHapticImpact();
              setSelectedAge(range);
            }}
          >
            {range}
          </button>
        ))}
      </div>

      <span className="auth-label">Gender</span>
      <div className="auth-chips">
        {GENDERS.map((gender) => (
          <button
            key={gender}
            type="button"
            className={`auth-chip${selectedGender === gender ? ' is-selected' : ''}`}
            aria-pressed={selectedGender === gender}
            onClick={() => {
              safeHapticImpact();
              setSelectedGender(gender);
            }}
          >
            {gender}
          </button>
        ))}
      </div>
    </AuthShell>
  );
};

export default ProfileSetupScreen;
