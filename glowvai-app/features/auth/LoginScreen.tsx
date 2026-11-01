import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { sendPhoneOtp } from '../../core/services/authService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { logTouch } from '../../core/utils/touchDoctor';
import { errorMessageOf } from './authUtils';

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
      navigate('auth-otp', {
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
            Skip
          </button>
        </div>

        <div className="auth-login-lockup">
          <button type="button" className="auth-brand-tap" onClick={handleLogoTap} aria-label="glowvai">
            <span className="auth-brand-wordmark">glowvai</span>
          </button>
          <p className="auth-login-tagline">Skin analysis, skincare and delivery in one place.</p>
        </div>
      </div>

      <div className="auth-login-sheet">
        <div className="auth-login-content">
          <h1 className="auth-title">Enter your mobile number</h1>
          <p className="auth-subtitle">We&apos;ll text you a 6-digit code to sign in.</p>

          <form className="auth-login-form" onSubmit={handleSendOtp} noValidate>
            <label htmlFor="auth-mobile" className="auth-label">
              Mobile number
            </label>
            <div className={`auth-phone-field${errorMessage ? ' has-error' : ''}`}>
              <span className="login-india-flag" role="img" aria-label="India">
                <i className="is-saffron" /><i className="is-white"><b /></i><i className="is-green" />
              </span>
              <strong>+91</strong>
              <span className="auth-divider" aria-hidden="true" />
              <input
                id="auth-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
                value={formatPhoneNumber(rawDigits)}
                onChange={(event) => handleTextChange(event.target.value)}
                placeholder="10-digit number"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? 'auth-mobile-error' : undefined}
              />
            </div>

            {errorMessage && (
              <div id="auth-mobile-error" className="auth-error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" className="auth-primary-button auth-login-continue" disabled={!isValidNumber || isLoading}>
              {isLoading ? <span className="auth-spinner" aria-label="Sending OTP" /> : 'Continue'}
            </button>
          </form>

          <p className="auth-legal">
            By continuing, you accept the{' '}
            <a className="auth-link" href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a> and{' '}
            <a className="auth-link" href="/terms" target="_blank" rel="noopener noreferrer">terms of use</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default LoginScreen;
