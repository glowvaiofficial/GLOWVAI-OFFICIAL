import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { ScreenName } from '../../context/contextDefinition';
import { auth } from '../../core/config/firebase';
import { afterSignIn } from './accountGate';
import { ensureAccountRecord } from './accountService';
import { SignInHero } from './SignInHero';
import { CODE_INPUT_ERROR, RESEND_SECONDS, maskedPhone, otpCode, OTP_LENGTH } from './phoneAuthRules';
import { confirmPhoneCode, pendingPhone, sendPhoneCode } from './phoneSignIn';
import { takeHeldAction } from './resumeAction';
import '../../responsive/entry-scan.css';

// The 6-digit SMS code. A correct code signs the phone account in and writes its record on the server; then the
// customer goes back to where they were, or to the shop, and any action that waited for sign-in runs.
export const OtpScreen: React.FC = () => {
  const { navigate, goBack, activeParams, showToast } = useApp();
  const returnTo: string | null = typeof activeParams?.returnTo === 'string' ? activeParams.returnTo : null;
  const returnParams = activeParams?.returnParams ?? null;
  // Held in memory from the phone screen. Null after a reload: the number is then asked for again.
  const [phone] = useState<string | null>(() => pendingPhone());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  // Set when the code was right but the account record could not be saved yet: the next press only retries that step.
  const [recordUid, setRecordUid] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const finish = () => {
    showToast("You're in");
    const target = afterSignIn({ returnTo, returnParams });
    navigate(target.screen as ScreenName, target.params);
    takeHeldAction()?.();
  };

  const saveRecord = async (uid: string) => {
    setBusy(true);
    const saved = await ensureAccountRecord(uid);
    setBusy(false);
    if (!saved.ok) {
      setRecordUid(uid);
      setError(saved.error);
      return;
    }
    setRecordUid(null);
    finish();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recordUid) {
      setError(null);
      await saveRecord(recordUid);
      return;
    }
    const checked = otpCode(code);
    if (!checked) {
      setError(CODE_INPUT_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await confirmPhoneCode(checked);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    const uid = auth?.currentUser?.uid ?? null;
    if (!uid) {
      setBusy(false);
      setError('We could not finish signing you in. Try again.');
      return;
    }
    await saveRecord(uid);
  };

  const resend = async () => {
    if (secondsLeft > 0 || !phone || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await sendPhoneCode(phone);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    setNotice('A new code is on its way.');
  };

  const enterNumberAgain = () => {
    navigate('auth-login', { returnTo, returnParams });
  };

  return (
    <main className="login-reference-screen">
      <SignInHero />

      <section className="login-reference-sheet">
        {phone ? (
          <>
            <div className="login-sheet-copy">
              <h1>Enter the code</h1>
              <p>We sent a {OTP_LENGTH}-digit code by SMS to {maskedPhone(phone)}.</p>
            </div>

            <form className="login-reference-form" onSubmit={submit} noValidate>
              <label htmlFor="sign-in-code" className="login-field-label">{OTP_LENGTH}-digit code</label>
              <div className="login-phone-field is-plain">
                <input
                  id="sign-in-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={code}
                  disabled={recordUid !== null}
                  onChange={(event) => {
                    setError(null);
                    setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                  }}
                  placeholder="6-digit code"
                  aria-describedby={error ? 'sign-in-code-error' : undefined}
                />
              </div>

              {notice && <p className="login-details-note" role="status">{notice}</p>}

              {error && (
                <div role="alert" id="sign-in-code-error" className="login-phone-error">
                  <AlertCircle aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button className="login-continue-button" type="submit" disabled={busy}>
                {busy ? 'Checking…' : recordUid ? 'Try again' : 'Verify and continue'}
              </button>
            </form>

            <p className="login-legal-copy">
              <button type="button" onClick={resend} disabled={secondsLeft > 0 || busy}>
                {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
              </button>
            </p>
            <p className="login-legal-copy">
              <button type="button" onClick={() => goBack()}>Change number</button>
            </p>
          </>
        ) : (
          <>
            <div className="login-sheet-copy">
              <h1>This code is no longer active</h1>
              <p>Enter your mobile number again to get a new code.</p>
            </div>
            <button className="login-continue-button" type="button" onClick={enterNumberAgain}>
              Enter my number
            </button>
          </>
        )}
      </section>
    </main>
  );
};
