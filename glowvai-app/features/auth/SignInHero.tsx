import React from 'react';
import { ScanFace, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import '../../responsive/entry-scan.css';

const benefits = [
  { id: 'analysis', label: <>AI Face<br />Analysis</>, icon: <ScanFace aria-hidden="true" /> },
  { id: 'recommendations', label: <>Personalized<br />Recommendations</>, icon: <Sparkles aria-hidden="true" /> },
  { id: 'delivery', label: <>Quick<br />Delivery</>, icon: <Truck aria-hidden="true" /> },
  { id: 'insurance', label: <>Beauty<br />Insurance</>, icon: <ShieldCheck aria-hidden="true" /> },
];

// The brand panel at the top of the sign-in screens (phone, code and details).
export const SignInHero: React.FC = () => (
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
);
