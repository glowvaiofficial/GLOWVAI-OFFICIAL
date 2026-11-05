import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, ScanFace, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ScreenName } from '../context/contextDefinition';
import '../responsive/entry-scan.css';

const benefits = [
  { id: 'analysis', label: <>AI Face<br />Analysis</>, icon: <ScanFace aria-hidden="true" /> },
  { id: 'recommendations', label: <>Personalized<br />Recommendations</>, icon: <Sparkles aria-hidden="true" /> },
  { id: 'delivery', label: <>Quick<br />Delivery</>, icon: <Truck aria-hidden="true" /> },
  { id: 'insurance', label: <>Beauty<br />Insurance</>, icon: <ShieldCheck aria-hidden="true" /> },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Your details": name, mobile number and an optional email, saved to the customer's account on the server
// (POST /api/shop/profile). There is no sign-in code: SMS verification is not connected yet, and the screen says so.
export const LoginScreen: React.FC = () => {
  const { navigate, goBack, activeParams, customerDetails, saveCustomerDetails } = useApp();
  const returnTo: ScreenName = activeParams?.returnTo || 'shop-home';
  const [name, setName] = useState(customerDetails?.fullName || activeParams?.name || '');
  const [phone, setPhone] = useState(String(customerDetails?.phoneNumber || activeParams?.phone || '').replace(/\D/g, '').slice(-10));
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
      <section className="login-reference-hero" aria-label="Glowvai benefits">
        <span className="login-orb login-orb-right" aria-hidden="true" />
        <span className="login-orb login-orb-left" aria-hidden="true" />

        <div className="login-brand-lockup">
          <span className="login-brand-mark" aria-hidden="true"><span>g</span></span>
          <div className="brand-wordmark login-wordmark">glowvai</div>
          <p>The Beauty Destination<br />for Every Indian</p>
        </div>

        <div className="login-benefits">
          {benefits.map((benefit) => (
            <div className="login-benefit" key={benefit.id}>
              <span>{benefit.icon}</span>
              <p>{benefit.label}</p>
            </div>
          ))}
        </div>
      </section>

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
            <span>We will verify your number by SMS once SMS sign-in is available.</span>
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
