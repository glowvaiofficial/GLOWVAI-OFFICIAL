import React from 'react';
import { Headphones, Info, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

// "+919876543210" or "9876543210" -> "+91 98765 43210"
const formatPhone = (value?: string | null): string => {
  const digits = (value ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '';
};

// Changing the sign-in number is not wired to a backend yet, so this screen shows the number on the
// account and hands the change to support instead of simulating an OTP and a success message.
export const ChangePhoneNumberScreen: React.FC = () => {
  const { goBack, navigate, user, customerDetails } = useApp();
  const currentPhone = formatPhone(user?.phoneNumber || customerDetails?.phoneNumber);

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
            <Headphones aria-hidden="true" /> Contact support
          </button>
          <button type="button" className="auth-secondary-button" onClick={goBack}>
            Go back
          </button>
        </>
      }
    >
      <h1 className="auth-title">Change phone number</h1>
      <p className="auth-subtitle">This is the number you use to sign in and get order updates.</p>

      <span className="auth-section-label">Current number</span>
      <div className="auth-card auth-current-phone">
        <span className="auth-card-icon" aria-hidden="true"><Smartphone /></span>
        <div>
          <span className="auth-hint">Signed in with</span>
          <strong className="auth-strong">{currentPhone || 'Not signed in'}</strong>
        </div>
      </div>

      <div className="auth-info-banner">
        <Info aria-hidden="true" />
        <div>
          <strong>Changes are handled by support</strong>
          <p>
            You can&apos;t change your number in the app yet. Contact support to ask for it to be updated.
          </p>
        </div>
      </div>
    </AuthShell>
  );
};

export default ChangePhoneNumberScreen;
