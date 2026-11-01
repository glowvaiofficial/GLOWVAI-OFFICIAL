import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser, sendPhoneOtp, verifyPhoneOtp } from '../../core/services/authService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';
import { errorMessageOf } from './authUtils';

// Firebase SMS codes are 6 digits
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// "+919876543210" -> "+91 98765 43210"
const formatDisplayPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '';
};

export const OtpVerificationScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const phoneNumber: string = activeParams?.phoneNumber || '';
  const displayPhone = formatDisplayPhone(phoneNumber);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const focusCell = (index: number) => {
    const bounded = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[bounded]?.focus();
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setIsShaking(true);
    window.setTimeout(() => setIsShaking(false), 450);
  };

  const verifyCode = async (code: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setIsVerifying(true);
    setErrorMessage(null);
    safeHapticImpact();

    try {
      await verifyPhoneOtp(code);
      navigate(getCurrentUser() ? 'shop-home' : 'auth-profile-setup');
    } catch (err: unknown) {
      setDigits(Array(OTP_LENGTH).fill(''));
      focusCell(0);
      showError(errorMessageOf(err, 'Incorrect verification code. Please try again.'));
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleChange = (index: number, raw: string) => {
    setErrorMessage(null);
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) focusCell(index + 1);
    if (next.every(Boolean)) void verifyCode(next.join(''));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace' || digits[index] || index === 0) return;
    event.preventDefault();
    const next = [...digits];
    next[index - 1] = '';
    setDigits(next);
    focusCell(index - 1);
  };

  // Pasting a full code fills every cell and verifies it
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setErrorMessage(null);
    setDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? ''));
    focusCell(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) void verifyCode(pasted);
  };

  const handleResend = async () => {
    if (countdown > 0 || !phoneNumber) return;
    safeHapticImpact();
    setCountdown(RESEND_SECONDS);
    setDigits(Array(OTP_LENGTH).fill(''));
    setErrorMessage(null);
    focusCell(0);
    try {
      await sendPhoneOtp(phoneNumber);
    } catch {
      // safe fallback
    }
  };

  const countdownLabel = `0:${countdown < 10 ? `0${countdown}` : countdown}`;

  const code = digits.join('');

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button
          type="button"
          className="auth-primary-button"
          onClick={() => void verifyCode(code)}
          disabled={code.length !== OTP_LENGTH || isVerifying}
        >
          {isVerifying ? <span className="auth-spinner" aria-label="Verifying" /> : 'Verify and continue'}
        </button>
      }
    >
      <h1 className="auth-title">Verify your number</h1>
      <p className="auth-subtitle">
        Enter the {OTP_LENGTH}-digit code sent to{' '}
        {displayPhone ? <strong className="auth-strong">{displayPhone}</strong> : 'your mobile number'}.{' '}
        <button type="button" className="auth-text-button auth-inline-link" onClick={goBack}>
          Change number
        </button>
      </p>

      <div className={`auth-otp-cells${isShaking ? ' is-shaking' : ''}${errorMessage ? ' has-error' : ''}`} role="group" aria-label="Verification code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            className={`auth-otp-cell${digit ? ' is-filled' : ''}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={isVerifying}
            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
            aria-invalid={Boolean(errorMessage)}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>

      {isVerifying && (
        <div className="auth-status-row" role="status">
          <span className="auth-spinner auth-spinner-dark" aria-hidden="true" />
          <span>Verifying code...</span>
        </div>
      )}

      {errorMessage && (
        <div className="auth-error" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="auth-status-row">
        {countdown > 0 ? (
          <span>
            Resend code in <strong className="auth-strong auth-mono">{countdownLabel}</strong>
          </span>
        ) : (
          <button type="button" className="auth-text-button auth-resend" onClick={handleResend} disabled={!phoneNumber}>
            <RefreshCw aria-hidden="true" />
            Resend code
          </button>
        )}
      </div>
    </AuthShell>
  );
};

export default OtpVerificationScreen;
