import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Delete, LockKeyhole, RefreshCw, Send, Shield, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

const OTP_LENGTH = 6;
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const OtpScreen: React.FC = () => {
  const { navigate, goBack, verifyUserOtp, loginUser, showToast, activeParams } = useApp();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const screen = useRef<HTMLElement | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const verificationLocked = useRef(false);

  const phone: string = activeParams?.phone || '';
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const formattedPhone = cleanPhone ? `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : '98765 43210';

  useLayoutEffect(() => {
    const lockToAvailableHeight = () => {
      const host = screen.current?.parentElement;
      const height = host?.getBoundingClientRect().height ?? window.innerHeight;
      setLockedHeight(Math.round(height));
      if (host) host.scrollTop = 0;
    };

    lockToAvailableHeight();
    window.addEventListener('orientationchange', lockToAvailableHeight);
    return () => window.removeEventListener('orientationchange', lockToAvailableHeight);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const selectCell = (index: number, focusInput: boolean) => {
    const bounded = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    setActiveIndex(bounded);
    if (focusInput) inputs.current[bounded]?.focus({ preventScroll: true });
  };

  const focusCell = (index: number) => selectCell(index, true);

  const verifyCode = async (code: string) => {
    if (code.length !== OTP_LENGTH || verificationLocked.current) return;
    verificationLocked.current = true;
    try {
      setLoading(true);
      setError(null);
      await verifyUserOtp(code);
      navigate('home');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Verification failed. Check the code and try again.');
    } finally {
      verificationLocked.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH || loading || error) return;
    const timer = window.setTimeout(() => void verifyCode(code), 240);
    return () => window.clearTimeout(timer);
  }, [otp]);

  const commitDigits = (start: number, rawValue: string, focusNext = true) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, OTP_LENGTH - start);
    if (!digits) return;

    setError(null);
    setOtp((current) => {
      const next = [...current];
      digits.split('').forEach((digit, offset) => { next[start + offset] = digit; });
      const nextIndex = Math.min(start + digits.length, OTP_LENGTH - 1);
      window.requestAnimationFrame(() => selectCell(nextIndex, focusNext));
      return next;
    });
  };

  const removeDigit = (fromIndex?: number, focusInput = true) => {
    setError(null);
    setOtp((current) => {
      const next = [...current];
      const preferred = fromIndex ?? activeIndex;
      let index = next[preferred] ? preferred : preferred - 1;
      if (fromIndex === undefined) {
        index = -1;
        for (let position = next.length - 1; position >= 0; position -= 1) {
          if (next[position]) { index = position; break; }
        }
      }
      if (index < 0) index = 0;
      next[index] = '';
      window.requestAnimationFrame(() => selectCell(index, focusInput));
      return next;
    });
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      removeDigit(index);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusCell(index + 1);
    }
  };

  const handleKeypadDigit = (digit: string) => {
    const firstEmpty = otp.findIndex((value) => !value);
    commitDigits(firstEmpty === -1 ? activeIndex : firstEmpty, digit, false);
  };

  const handleResend = async () => {
    if (cooldown > 0 || !phone) return;
    setError(null);
    try {
      await loginUser(phone);
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
      selectCell(0, false);
      showToast('A new OTP was sent');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'We could not resend the OTP. Try again.');
    }
  };

  return (
    <main
      ref={screen}
      className="otp-reference-screen"
      style={lockedHeight ? { '--otp-locked-height': `${lockedHeight}px` } as React.CSSProperties : undefined}
    >
      <section className="otp-reference-hero" aria-labelledby="otp-title">
        <span className="otp-orb otp-orb-top" aria-hidden="true" />
        <span className="otp-orb otp-orb-right" aria-hidden="true" />
        <span className="otp-orb otp-orb-bottom" aria-hidden="true" />

        <button className="otp-back" type="button" onClick={goBack} aria-label="Back to mobile number">
          <ArrowLeft aria-hidden="true" />
        </button>

        <div className="otp-hero-content">
          <div className="otp-security-art" aria-hidden="true">
            <span className="otp-cloud otp-cloud-one" />
            <span className="otp-cloud otp-cloud-two" />
            <span className="otp-shield"><Shield /><LockKeyhole /></span>
            <Send className="otp-plane" />
            <Sparkles className="otp-sparkle otp-sparkle-one" />
            <Sparkles className="otp-sparkle otp-sparkle-two" />
          </div>

          <div className="otp-copy">
            <h1 id="otp-title">Verify Your Number</h1>
            <p>We've sent a 6-digit OTP to<br /><strong>+91 {formattedPhone}</strong></p>
            {(process.env.NODE_ENV !== 'production') && <p className="otp-dev-hint">Development demo code: 123456</p>}
          </div>

          <div className="otp-cells" role="group" aria-label="Six-digit verification code">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(node) => { inputs.current[index] = node; }}
                id={`otp-input-${index}`}
                className={digit ? 'is-filled' : ''}
                style={{ '--otp-order': index } as React.CSSProperties}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={index === 0 ? OTP_LENGTH : 1}
                value={digit}
                onFocus={() => {
                  setActiveIndex(index);
                  const host = screen.current?.parentElement;
                  if (host) host.scrollTop = 0;
                }}
                onChange={(event) => commitDigits(index, event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  commitDigits(index, event.clipboardData.getData('text'));
                }}
                onKeyDown={(event) => handleKeyDown(index, event)}
                aria-label={`OTP digit ${index + 1}`}
                aria-invalid={Boolean(error)}
                disabled={loading}
              />
            ))}
          </div>

          <div className="otp-resend" aria-live="polite">
            <RefreshCw aria-hidden="true" />
            {cooldown > 0 ? (
              <span>Resend OTP in <strong>00:{String(cooldown).padStart(2, '0')}</strong></span>
            ) : (
              <button type="button" onClick={handleResend}>Resend OTP</button>
            )}
          </div>

          <div className={`otp-validity${loading ? ' is-verifying' : ''}`}>
            <ShieldCheck aria-hidden="true" />
            <span>{loading ? 'Verifying your code…' : 'This code is valid for 5 minutes'}</span>
          </div>

          {error && <p className="otp-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="otp-keypad-sheet" aria-label="Numeric keypad">
        <span className="otp-sheet-handle" aria-hidden="true" />
        <div className="otp-keypad">
          {KEYPAD.map((digit, index) => (
            <button key={digit} type="button" style={{ '--key-order': index } as React.CSSProperties} onClick={() => handleKeypadDigit(digit)} disabled={loading}>{digit}</button>
          ))}
          <button className="otp-delete-key" type="button" style={{ '--key-order': 9 } as React.CSSProperties} onClick={() => removeDigit(undefined, false)} disabled={loading} aria-label="Delete digit"><Delete aria-hidden="true" /></button>
          <button type="button" style={{ '--key-order': 10 } as React.CSSProperties} onClick={() => handleKeypadDigit('0')} disabled={loading}>0</button>
          <span className="otp-key-spacer" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
};
