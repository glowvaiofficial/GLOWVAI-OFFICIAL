import React, { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { sendPhoneOtp } from '../../core/services/authService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { logTouch } from '../../core/utils/touchDoctor';
import { errorMessageOf } from './authUtils';
const mascotFox = '/glowvai/features/auth/assets/mascot-fox.png';
const mascotCat = '/glowvai/features/auth/assets/mascot-cat.png';

export const validateIndianPhoneNumber = (digits: string): boolean => {
  const clean = digits.replace(/\D/g, '');
  return clean.length === 10 && /^[6-9]/.test(clean);
};

// Auto 5+5 digit formatting ("98765 43210")
const formatPhoneNumber = (digits: string): string => {
  const clean = digits.replace(/\D/g, '').slice(0, 10);
  return clean.length > 5 ? `${clean.slice(0, 5)} ${clean.slice(5)}` : clean;
};

export const LoginScreen: React.FC = () => {
  const { navigate } = useApp();
  const [rawDigits, setRawDigits] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoTapCount, setLogoTapCount] = useState(0);

  const isValidNumber = validateIndianPhoneNumber(rawDigits);

  // 7 taps on the logo opens the hidden app doctor screen
  const handleLogoTap = () => {
    const nextCount = logoTapCount + 1;
    if (nextCount >= 7) {
      setLogoTapCount(0);
      safeHapticImpact();
      navigate('debug-app-doctor');
      return;
    }
    setLogoTapCount(nextCount);
  };

  const handleTextChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 10);
    setRawDigits(clean);
    setErrorMessage(
      clean.length > 0 && !/^[6-9]/.test(clean)
        ? 'Enter a valid 10-digit mobile number starting with 6-9'
        : null
    );
  };

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidNumber || isLoading) return;

    logTouch('Continue Button Clicked', { screen: 'LoginScreen', extra: { phone: rawDigits } });
    safeHapticImpact();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fullPhone = `+91${rawDigits}`;
      const confirmationResult = await sendPhoneOtp(fullPhone);
      setIsLoading(false);
      // The three onboarding screens come between the phone number and the verification code.
      navigate('onboarding', {
        phoneNumber: fullPhone,
        verificationId: confirmationResult?.verificationId || 'demo-vid',
      });
    } catch (err: unknown) {
      setIsLoading(false);
      const code = (err as { code?: string } | null)?.code;
      setErrorMessage(
        code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again in a few minutes.'
          : errorMessageOf(err, 'Failed to send OTP. Please check your network.')
      );
    }
  };

  const handleSkip = () => {
    logTouch('Header Skip Button', { screen: 'LoginScreen' });
    safeHapticImpact();
    navigate('shop-home');
  };

  return (
    <section className="auth-login">
      <div className="auth-login-hero">
        <span className="auth-orb auth-orb-right" aria-hidden="true" />
        <span className="auth-orb auth-orb-left" aria-hidden="true" />

        <div className="auth-login-topbar">
          <button type="button" className="auth-skip-pill" onClick={handleSkip}>
            skip
          </button>
        </div>

        <button type="button" className="auth-brand-tap" onClick={handleLogoTap} aria-label="glowvai">
          <span className="auth-brand-wordmark">glowvai</span>
        </button>

        <img className="auth-mascot auth-mascot-left" src={mascotFox} alt="" aria-hidden="true" />
        <img className="auth-mascot auth-mascot-right" src={mascotCat} alt="" aria-hidden="true" />
      </div>

      <div className="auth-login-sheet">
        <h1 className="auth-title">Enter your number</h1>

        <form className="auth-login-form" onSubmit={handleSendOtp} noValidate>
          <label htmlFor="auth-mobile" className="auth-label">
            Mobile Number
          </label>
          <div className={`auth-phone-field${errorMessage ? ' has-error' : ''}`}>
            <span className="auth-flag" aria-hidden="true">🇮🇳</span>
            <strong>+91</strong>
            <ChevronDown className="auth-chevron" aria-hidden="true" />
            <span className="auth-divider" aria-hidden="true" />
            <input
              id="auth-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              maxLength={11}
              value={formatPhoneNumber(rawDigits)}
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder="98765 43210"
              aria-invalid={Boolean(errorMessage)}
            />
          </div>

          {errorMessage && (
            <div className="auth-error" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button type="submit" className="auth-primary-button auth-login-continue" disabled={!isValidNumber || isLoading}>
            {isLoading ? <span className="auth-spinner" aria-label="Sending OTP" /> : 'Continue'}
          </button>
        </form>

        <p className="auth-legal">
          By clicking, I accept the <span className="auth-link">privacy policy</span> and{' '}
          <span className="auth-link">terms of use</span>
        </p>
      </div>
    </section>
  );
};

export default LoginScreen;
