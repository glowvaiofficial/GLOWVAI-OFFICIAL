import React from 'react';
import { ArrowLeft, ScanFace, ShieldCheck, Truck } from 'lucide-react';
import { BrandLogo } from '../../../shared/BrandLogo';

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  topRight?: React.ReactNode;
}


/** Shared frame for auth screens: optional top bar, scrolling body, sticky footer. Brand panel shows at 1024px+. */
export const AuthShell: React.FC<AuthShellProps> = ({ children, footer, onBack, topRight }) => (
  <section className="auth-screen">
    <aside className="auth-brand-panel" aria-hidden="true" hidden>
      <img className="auth-brand-art" src="/glowvai/assets/onboarding/hero-skin-v2.webp" alt="" loading="lazy" decoding="async" />
      <div className="auth-brand-foot">
        <span className="auth-brand-wordmark"><BrandLogo height={52} white /></span>
        <p className="auth-brand-copy">AI skin check, skincare and doorstep delivery in one place.</p>
        <ul className="auth-brand-points">
          <li><ScanFace aria-hidden="true" />Skin scan that shows only what it measured</li>
          <li><Truck aria-hidden="true" />Skincare delivered to your door</li>
          <li><ShieldCheck aria-hidden="true" />Your photo is used only for your assessment</li>
        </ul>
      </div>
    </aside>
    {(onBack || topRight) && (
      <header className="auth-topbar">
        {onBack ? (
          <button type="button" className="auth-icon-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        {topRight}
      </header>
    )}
    <div className="auth-body">{children}</div>
    {footer && <footer className="auth-footer">{footer}</footer>}
  </section>
);
