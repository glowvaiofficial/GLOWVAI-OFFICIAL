import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

const CURRENT_PHONE = '+91 98765 43210';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// Same flow as the mobile app: the OTP send and verify steps are simulated and not yet wired to Firebase.
export const ChangePhoneNumberScreen: React.FC = () => {
  const { goBack, showToast } = useApp();
  const [newPhone, setNewPhone] = useState('');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  const handleSendOtp = () => {
    if (newPhone.trim().length < 10) {
      showToast('Please enter a valid 10-digit mobile number.');
      return;
    }
    safeHapticImpact();
    setIsSendingOtp(true);
    window.setTimeout(() => {
      setIsSendingOtp(false);
      setStep('OTP');
      setResendTimer(RESEND_SECONDS);
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (otp.join('').length < OTP_LENGTH) {
      showToast('Please enter the complete 6-digit verification code.');
      return;
    }
    safeHapticImpact();
    setIsVerifying(true);
    window.setTimeout(() => {
      setIsVerifying(false);
      showToast(`Your phone number has been updated to +91 ${newPhone}.`);
      goBack();
    }, 700);
  };

  const handleOtpChange = (value: string, index: number) => {
    const next = [...otp];
    next[index] = value.replace(/\D/g, '').slice(-1);
    setOtp(next);
    safeHapticImpact(5);
  };

  const handleBack = () => {
    safeHapticImpact();
    if (step === 'OTP') setStep('INPUT');
    else goBack();
  };

  return (
    <AuthShell
      onBack={handleBack}
      footer={
        step === 'INPUT' ? (
          <button type="button" className="auth-primary-button" onClick={handleSendOtp} disabled={isSendingOtp}>
            {isSendingOtp ? <span className="auth-spinner" aria-label="Sending" /> : 'Send OTP Verification →'}
          </button>
        ) : (
          <button type="button" className="auth-primary-button" onClick={handleVerifyOtp} disabled={isVerifying}>
            {isVerifying ? <span className="auth-spinner" aria-label="Verifying" /> : 'Verify & Update Phone Number →'}
          </button>
        )
      }
    >
      <h1 className="auth-page-heading">
        <Sparkles aria-hidden="true" /> Change Phone Number
      </h1>

      <div className="auth-info-banner">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Account Protection</strong>
          <p>For your account security, an SMS verification OTP will be sent to confirm your new mobile number.</p>
        </div>
      </div>

      {step === 'INPUT' ? (
        <>
          <span className="auth-section-label">Current Phone Number</span>
          <div className="auth-card auth-current-phone">
            <span className="auth-card-icon" aria-hidden="true"><Smartphone /></span>
            <div>
              <span className="auth-hint">Registered Mobile</span>
              <strong className="auth-strong">{CURRENT_PHONE}</strong>
            </div>
            <span className="auth-active-badge"><CheckCircle2 aria-hidden="true" /> Active</span>
          </div>

          <span className="auth-section-label">New Phone Number</span>
          <div className="auth-card">
            <label className="auth-label" htmlFor="auth-new-phone">Enter New Mobile Number</label>
            <div className="auth-field">
              <span className="auth-flag" aria-hidden="true">🇮🇳</span>
              <strong>+91</strong>
              <input
                id="auth-new-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={newPhone}
                onChange={(event) => setNewPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <span className="auth-section-label">Enter Verification Code</span>
          <div className="auth-card">
            <p className="auth-subtitle auth-card-copy">
              We sent a 6-digit code to <strong className="auth-strong">+91 {newPhone}</strong>
            </p>
            <div className="auth-otp-cells auth-otp-cells-compact">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  className={`auth-otp-cell${digit ? ' is-filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  onChange={(event) => handleOtpChange(event.target.value, index)}
                />
              ))}
            </div>
            <div className="auth-status-row auth-status-row-tight">
              <span>Didn&apos;t receive code?</span>
              <button
                type="button"
                className="auth-text-button"
                disabled={resendTimer > 0}
                onClick={() => {
                  safeHapticImpact();
                  setResendTimer(RESEND_SECONDS);
                }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        </>
      )}

    </AuthShell>
  );
};

export default ChangePhoneNumberScreen;
