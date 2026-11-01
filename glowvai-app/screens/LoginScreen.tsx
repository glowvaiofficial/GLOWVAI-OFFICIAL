import React, { useState } from 'react';
import { AlertCircle, ScanFace, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

const benefits = [
  { id: 'analysis', label: <>AI Face<br />Analysis</>, icon: <ScanFace aria-hidden="true" /> },
  { id: 'recommendations', label: <>Personalized<br />Recommendations</>, icon: <Sparkles aria-hidden="true" /> },
  { id: 'delivery', label: <>Quick<br />Delivery</>, icon: <Truck aria-hidden="true" /> },
  { id: 'insurance', label: <>Insurance on<br />select items</>, icon: <ShieldCheck aria-hidden="true" /> },
];

export const LoginScreen: React.FC = () => {
  const { navigate, loginUser } = useApp();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^[6-9]\d{9}$/.test(phone);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginUser(phone);
      navigate('otp', { phone });
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'We could not send the OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-reference-screen">
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
          <h1>Enter mobile number</h1>
          <p>Log in to manage your orders, get personalized<br className="login-copy-break" /> beauty recommendations and more.</p>
        </div>

        <form className="login-reference-form" onSubmit={submit} noValidate>
          <label htmlFor="mobile" className="sr-only">Mobile number</label>
          <div className={`login-phone-field${error ? ' has-error' : ''}`}>
            <span className="login-india-flag" role="img" aria-label="India">
              <i className="is-saffron" /><i className="is-white"><b /></i><i className="is-green" />
            </span>
            <strong>+91</strong>
            <span className="login-phone-divider" aria-hidden="true" />
            <input
              id="mobile"
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-phone-error' : undefined}
            />
          </div>

          {error && (
            <div id="login-phone-error" role="alert" className="login-phone-error">
              <AlertCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button className="login-continue-button" type="submit" disabled={loading}>
            {loading ? 'Sending OTP…' : 'Continue'}
          </button>
        </form>

        <p className="login-legal-copy">
          By continuing, you accept the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>{' '}
          and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </p>
      </section>
    </main>
  );
};
