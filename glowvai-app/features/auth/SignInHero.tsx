import React from 'react';
import { ScanFace, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { BrandLogo } from '../../shared/BrandLogo';
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

    <img className="v5-hero-art" src="/glowvai/assets/onboarding/hero-skin-v2.webp" alt="" loading="lazy" decoding="async" />

    <div className="login-brand-lockup">
      <div className="login-wordmark"><BrandLogo height={58} white /></div>
      <p>The Beauty Destination<br />for Every Indian</p>
    </div>

    <ul className="v5-hero-points">
      <li><ScanFace aria-hidden="true" />Skin scan that shows only what it measured</li>
      <li><Truck aria-hidden="true" />Skincare delivered to your door</li>
      <li><ShieldCheck aria-hidden="true" />Your photo is used only for your assessment</li>
    </ul>

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
