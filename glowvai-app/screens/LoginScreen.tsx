import React, { useEffect, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ScreenName } from '../context/contextDefinition';
import { SignInHero } from '../features/auth/SignInHero';
import '../responsive/entry-scan.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Your details": name, mobile number and an optional email, saved to the customer's account on the server
// (POST /api/shop/profile). The mobile number is the one the account signed in with, so it cannot be changed here.
export const LoginScreen: React.FC = () => {
  const { navigate, goBack, activeParams, customerDetails, saveCustomerDetails, accountPhone } = useApp();
  const returnTo: ScreenName = activeParams?.returnTo || 'shop-home';
  const verifiedPhone = accountPhone ? accountPhone.replace(/\D/g, '').slice(-10) : '';
  const [name, setName] = useState(customerDetails?.fullName || activeParams?.name || '');
  const [phone, setPhone] = useState(verifiedPhone || String(customerDetails?.phoneNumber || activeParams?.phone || '').replace(/\D/g, '').slice(-10));
  const [email, setEmail] = useState(customerDetails?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details may arrive from the server after the screen opened.
  useEffect(() => {
    if (!customerDetails) return;
    setName((v: string) => v || customerDetails.fullName);
    setPhone((v: string) => v || customerDetails.phoneNumber);
    setEmail((v: string) => v || customerDetails.email);
  }, [customerDetails]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError('Enter your name.');
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit Indian mobile number.');
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email, or leave it empty.');

    setLoading(true);
    setError(null);
    const result = await saveCustomerDetails({ fullName: name.trim(), phoneNumber: phone, email: email.trim() });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'We could not save your details. Try again.');
      return;
    }
    navigate(returnTo, activeParams?.returnParams);
  };

  return (
    <main className="login-reference-screen is-details">
      <SignInHero />

      <section className="login-reference-sheet">
        <div className="login-sheet-copy">
          <h1>Your details</h1>
          <p>We use these for your orders, deliveries and support requests.</p>
        </div>

        <form className="login-reference-form" onSubmit={submit} noValidate>
          <label htmlFor="details-name" className="login-field-label">Full name</label>
          <div className="login-phone-field is-plain">
            <input id="details-name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => { setError(null); setName(e.target.value); }} placeholder="Your name" />
          </div>

          <label htmlFor="details-mobile" className="login-field-label">Mobile number</label>
          <div className="login-phone-field">
            <span className="login-india-flag" role="img" aria-label="India">
              <i className="is-saffron" /><i className="is-white"><b /></i><i className="is-green" />
            </span>
            <strong>+91</strong>
            <span className="login-phone-divider" aria-hidden="true" />
            <input
              id="details-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              readOnly={Boolean(verifiedPhone)}
              onChange={(event) => {
                setError(null);
                setPhone(event.target.value.replace(/\D/g, ''));
              }}
              placeholder="10-digit mobile number"
            />
          </div>

          <label htmlFor="details-email" className="login-field-label">Email (optional)</label>
          <div className="login-phone-field is-plain">
            <input id="details-email" type="email" autoComplete="email" maxLength={120} value={email} onChange={(e) => { setError(null); setEmail(e.target.value); }} placeholder="For order receipts" />
          </div>

          <p className="login-details-note">
            <Info aria-hidden="true" />
            <span>{verifiedPhone ? 'Verified by SMS when you signed in.' : 'We use this number for deliveries and order updates.'}</span>
          </p>

          {error && (
            <div role="alert" className="login-phone-error">
              <AlertCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button className="login-continue-button" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        <p className="login-legal-copy">
          <button type="button" onClick={() => (activeParams?.returnTo ? goBack() : navigate('shop-home'))}>
            {activeParams?.returnTo ? 'Back' : 'Skip for now and browse'}
          </button>
        </p>
        <p className="login-legal-copy">
          By continuing, you accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a><br />
          and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </p>
      </section>
    </main>
  );
};
