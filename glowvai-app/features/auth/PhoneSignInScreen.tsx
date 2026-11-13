import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { SignInHero } from './SignInHero';
import { indianE164, PHONE_INPUT_ERROR } from './phoneAuthRules';
import { RECAPTCHA_CONTAINER_ID, sendPhoneCode } from './phoneSignIn';
import '../../responsive/entry-scan.css';

// Sign-in with a mobile number only: nothing else is asked here. The code is sent by SMS, and the account is created
// after the code is checked (features/auth/OtpScreen).
export const PhoneSignInScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const returnTo: string | null = typeof activeParams?.returnTo === 'string' ? activeParams.returnTo : null;
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const e164 = indianE164(digits);
    if (!e164) {
      setError(PHONE_INPUT_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await sendPhoneCode(e164);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('auth-otp', { returnTo, returnParams: activeParams?.returnParams ?? null });
  };

  return (
    <main className="login-reference-screen">
      <SignInHero />

      <section className="login-reference-sheet">
        <div className="login-sheet-copy">
          <h1>Sign in with your mobile</h1>
          <p>We will text you a 6-digit code. No password needed.</p>
        </div>

        <form className="login-reference-form" onSubmit={submit} noValidate>
          <label htmlFor="sign-in-mobile" className="login-field-label">Mobile number</label>
          <div className="login-phone-field">
            <span className="login-india-flag" role="img" aria-label="India">
              <i className="is-saffron" /><i className="is-white"><b /></i><i className="is-green" />
            </span>
            <strong>+91</strong>
            <span className="login-phone-divider" aria-hidden="true" />
            <input
              id="sign-in-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={digits}
              onChange={(event) => {
                setError(null);
                setDigits(event.target.value.replace(/\D/g, '').slice(0, 12));
              }}
              placeholder="10-digit mobile number"
              aria-describedby={error ? 'sign-in-mobile-error' : undefined}
            />
          </div>

          {error && (
            <div role="alert" id="sign-in-mobile-error" className="login-phone-error">
              <AlertCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* The invisible reCAPTCHA attaches here. It draws no box of its own. */}
          <div id={RECAPTCHA_CONTAINER_ID} />

          <button className="login-continue-button" type="submit" disabled={busy}>
            {busy ? 'Sending code…' : 'Send code'}
          </button>
        </form>

        <p className="login-legal-copy">
          {returnTo ? (
            <button type="button" onClick={() => goBack()}>Back</button>
          ) : (
            <button type="button" onClick={() => navigate('shop-home')}>Browse products first</button>
          )}
        </p>
        <p className="login-legal-copy">
          By continuing, you accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a><br />
          and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="gv-link-inline">Privacy Policy</a>
        </p>
      </section>
    </main>
  );
};
