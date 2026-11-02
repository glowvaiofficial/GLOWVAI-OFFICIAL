import React from 'react';
import { CheckCircle2, Headphones, Info, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser } from '../../core/services/authService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

const formatIndianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '';
};

// No number-change service exists yet, so this screen shows the number on file and sends people to support.
export const ChangePhoneNumberScreen: React.FC = () => {
  const { goBack, navigate, user } = useApp();
  const currentPhone = formatIndianPhone(user?.phoneNumber || getCurrentUser()?.phoneNumber || '');

  const handleContactSupport = () => {
    safeHapticImpact();
    navigate('profile-support');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <>
          <button type="button" className="auth-primary-button" onClick={handleContactSupport}>
            <Headphones aria-hidden="true" />
            Contact support
          </button>
          <button type="button" className="auth-secondary-button" onClick={goBack}>
            Go back
          </button>
        </>
      }
    >
      <h1 className="auth-title">Change phone number</h1>
      <p className="auth-subtitle">Your phone number is how you sign in to GlowVAI.</p>

      <span className="auth-section-label">Current phone number</span>
      <div className="auth-card auth-current-phone">
        <span className="auth-card-icon" aria-hidden="true"><Smartphone /></span>
        <div>
          <span className="auth-hint">Registered mobile</span>
          <strong className="auth-strong">{currentPhone || 'Not signed in'}</strong>
        </div>
        {currentPhone && <span className="auth-active-badge"><CheckCircle2 aria-hidden="true" /> Active</span>}
      </div>

      <div className="auth-info-banner">
        <Info aria-hidden="true" />
        <div>
          <strong>Changing your number online is not available yet</strong>
          <p>Our support team can move your account to a new number after confirming it is you.</p>
        </div>
      </div>
    </AuthShell>
  );
};

export default ChangePhoneNumberScreen;
